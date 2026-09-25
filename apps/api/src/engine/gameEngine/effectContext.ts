import { isTimingActivationDisabled } from "../effects/timingActivation.js";
import {
  EffectTiming,
  Zone,
  buildTriggerKey,
  getCardDefinition,
  type CardInstance,
  type Permanent,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { canAttackerDeclare } from "../combat/legality.js";
import { resolveKeywords } from "../combat/keywords.js";
import { effectiveKinds, effectiveNames, effectiveTraits } from "../effects/continuous.js";
import { createCardStateLookup, createEffectContext, createGameAccess } from "../effects/context.js";
import { createCardSource } from "../cards/CardSource.js";
import { type EffectEnvironment } from "../effects/index.js";
import type { CardSource } from "../effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
  RemovalCause,
  TriggerInfo,
} from "../effects/EffectContext.js";
import { detachLeaveReplacements, detachTraitTokens } from "../effects/detach.js";
import { guardLeaveReplacements } from "../effects/guard.js";
import { definitionOf } from "../cards/cardData.js";
import { consultLeavePrevention } from "../effects/leavePrevention.js";
import { consultDigivolutionTrashRedirect } from "../effects/digivolutionTrashRedirect.js";
import { findLooseInstance, instanceOnPermanent } from "./intents.js";
import { playEffectInstances } from "../effects/interpreter/actions/effectPlayAssembly.js";
import { effectiveColorsOf } from "./matchLifecycle.js";
import { createPrimitives } from "../effects/primitives.js";
import { resolveSelfWhenTrashedFromDeck } from "../effects/interpreter.js";
import { payBarrierSecurityCost } from "./securityCheck.js";
import { digivolveDeps } from "./actionDeps.js";
import {
  drainPendingAttackTriggers,
  fireBeforePayCost,
  fireEnteredByEffectTiming,
  fireTiming,
  fireTimingForInstance,
  prepareDigiXrosPlay,
  prepareDigiXrosPlays,
  projectLooseUseCost,
  reactivateOnPlay,
  resolveDeletionReactions,
  runTimingWindow,
} from "./timing.js";
import { collectRuleProcessMovements, flushRuleTriggerPool, nextInstanceId, nextPermanentId } from "./ruleProcess.js";
import {
  flushDeferredTimingWindows,
  inContinuousPass,
  parkDeferredSecurityRemovalTriggersForAttack,
  settleBetweenEffects,
} from "./windows.js";
import type { GameEngine } from "../GameEngine.js";

export function effectAccess(engine: GameEngine): GameAccess {
  engine.gameAccess ??= createGameAccess(
    engine.state,
    (id) => engine.continuous.linkMaxDelta(id),
    (id, traits) => engine.continuous.linkCostReduction(id, traits),
    (id, keyword) => {
      const permanent = engine.access.permanentById(id);
      return (
        (permanent !== undefined && resolveKeywords(permanent, engine.continuous).includes(keyword)) ||
        (keyword.toLowerCase() === "piercing" && engine.modifiers.hasPierce(id))
      );
    },
    (seat) => engine.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
    (permanentId, timing) => isTimingActivationDisabled(engine.continuous, permanentId, timing),
    (permanent) => effectiveColorsOf(engine, permanent),
    (instanceId) => engine.continuous.hasColorWaiver(instanceId),
    (instanceId) => engine.continuous.colorRequirementAlternatives(instanceId),
    (permanent) => canAttackerDeclare(engine.access, permanent.controllerSeat, permanent, engine.continuous) === null,
    (permanentId, printedTraits) => effectiveTraits(engine.continuous, permanentId, printedTraits),
    (permanentId, printedKinds) => effectiveKinds(engine.continuous, permanentId, printedKinds),
    (seat, base, evolving, sourceZone) =>
      engine.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
    undefined,
    (id, traits) =>
      engine.continuous.linkCostReductionGrant(
        id,
        traits,
        (key) => engine.tracker.count(`link-cost/${key}`, "replacement") > 0,
      ),
    (permanent, printedName) => effectiveNames(engine.continuous, permanent, printedName),
    (id) => engine.combat.battleOpponentOf(id),
  );
  return engine.gameAccess;
}

export function effectPrimitives(engine: GameEngine, ownerSeat: Seat): Primitives {
  // `gainMemory` is written from the resolving card's perspective ("gain N memory").
  // Most windows belong to the turn player, but Security and opponent-turn effects may
  // resolve for the non-turn player. Bind the convenience verb to the source owner here;
  // explicit cross-seat effects continue to use `gainMemoryForSeat` directly.
  engine.primitivesBySeat[ownerSeat] ??= {
    ...engine.primitives,
    gainMemory: (amount: number) => engine.primitives.gainMemoryForSeat(ownerSeat, amount),
  };
  return engine.primitivesBySeat[ownerSeat];
}

export function buildEffectContext(
  engine: GameEngine,
  source: CardSource,
  trigger: TriggerInfo,
  askOverride?: DecisionApi,
): EffectContext {
  return createEffectContext({
    source,
    trigger,
    game: effectAccess(engine),
    fx: effectPrimitives(engine, source.ownerSeat),
    ask: askOverride ?? engine.decisionApi,
    usage: engine.tracker,
  });
}

/** Find a card instance that is loose or anywhere in a battle-area permanent. */
function findInstanceAnywhere(engine: GameEngine, instanceId: string): CardInstance | undefined {
  const loose = findLooseInstance(engine, instanceId);
  if (loose !== undefined) return loose;
  for (const player of engine.state.players) {
    for (const permanent of player.battleArea) {
      const found = instanceOnPermanent(engine, permanent, instanceId);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

async function playForKeywordEffect(
  engine: GameEngine,
  sourceInstanceId: string,
  instanceIds: readonly string[],
): Promise<Permanent[]> {
  const source = findInstanceAnywhere(engine, sourceInstanceId);
  const playedCards = instanceIds
    .map((instanceId) => findInstanceAnywhere(engine, instanceId))
    .filter((card): card is CardInstance => card !== undefined)
    .map(({ instanceId, cardId, ownerSeat }) => ({ instanceId, cardId, ownerSeat }));
  if (source === undefined) return engine.primitives.playInstances([...instanceIds], { payCost: false });
  const ctx = buildEffectContext(engine, cardSourceOf(engine, source), {});
  return playEffectInstances(ctx, playedCards, { payCost: false });
}

/** Resolve the CardSource for a CardInstance against live state (placement/turn lookup). */
export function cardSourceOf(engine: GameEngine, instance: CardInstance): CardSource {
  const cached = engine.cardSourceByInstance.get(instance);
  if (cached !== undefined) return cached;
  engine.cardStateLookup ??= createCardStateLookup(engine.state);
  const source = createCardSource(instance, engine.cardStateLookup);
  engine.cardSourceByInstance.set(instance, source);
  return source;
}

/**
 * The framework environment a timing resolution runs against: authoritative state,
 * the effect verbs (fx), the player-decision API (ask), and the per-turn use ledger
 * (shared with activateEffect so maxPerTurn accounting is unified).
 */
export function effectEnvironment(engine: GameEngine, trigger: TriggerInfo): EffectEnvironment {
  return {
    state: engine.state,
    fx: engine.primitives,
    fxForSource: (source) => effectPrimitives(engine, source.ownerSeat),
    ask: engine.decisionApi,
    tracker: engine.tracker,
    continuous: engine.continuous,
    hasKeyword: (id, keyword) =>
      engine.continuous.hasKeyword(id, keyword) ||
      (keyword.toLowerCase() === "piercing" && engine.modifiers.hasPierce(id)),
    digivolvedThisTurn: (seat) => engine.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
    effectiveColors: (permanent) => effectiveColorsOf(engine, permanent),
    colorRequirementWaived: (instanceId) => engine.continuous.hasColorWaiver(instanceId),
    colorRequirementAlternatives: (instanceId) => engine.continuous.colorRequirementAlternatives(instanceId),
    canDeclareAttack: (permanent) =>
      canAttackerDeclare(engine.access, permanent.controllerSeat, permanent, engine.continuous) === null,
    battleOpponentOf: (id) => engine.combat.battleOpponentOf(id),
    triggerInfo: trigger,
  };
}

/**
 * CR §3-1-3-1-2: a card that leaves the field returns as a new card, so its [Once Per Turn]
 * effects are available again (EX12-065 replayed by ＜Fortitude＞, KB Q6866). A card still on
 * the field is the same Digimon (§3-4-5, KB Q4253) and keeps its counts. Forgetting at the
 * departure, not after the deletion reactions, keeps the use ＜Fortitude＞'s replay then spends.
 */
export function forgetUsesOfCardsLeavingField(engine: GameEngine, event: ServerEvent): void {
  if (event.kind !== "cardsMoved") return;
  const onField = (zone: string): boolean => zone === Zone.BattleArea || zone === Zone.Breeding;
  if (!onField(event.from) || onField(event.to)) return;
  for (const instanceId of event.instanceIds) engine.tracker.forgetInstance(instanceId);
}

/**
 * Single-sourced per-permanent teardown for every deletion seam. When a permanent
 * leaves the field its three per-permanent ledgers must be dropped together: the
 * modifier ledger (DP/keyword/cost modifiers), the continuous-rule store, and the
 * SubTrigger registry (delayed watchers + reduceCost/prevent REPLACEMENTS). The
 * effect-driven `deletePermanent` primitive does engine inline; combat and the security
 * check delete through raw state access and so route their cleanup here, so a stale
 * watcher or replacement from a source that died in battle/security cannot fire or
 * discount after the source is gone. Mirrors the DNA-digivolve material teardown.
 */
export function dropPermanentSubscriptions(engine: GameEngine, permanentId: string): void {
  engine.modifiers.dropPermanent(permanentId);
  engine.continuous.dropPermanent(permanentId);
  engine.subTriggers.dropPermanent(permanentId);
}

/**
 * Consult active "prevent" leave/delete replacements for the permanents an effect is about to
 * remove (subsystem: delayed-and-rule-effects). Delegates to the standalone
 * `consultLeavePrevention` (testable in isolation), supplying engine engine's registry,
 * permanent lookup, and context builder. Returns the subset whose removal was prevented;
 * default-safe (empty when no prevent replacement is active).
 */
export async function engineConsultLeavePrevention(
  engine: GameEngine,
  permanentIds: string[],
  cause: RemovalCause = "byEffect",
  resolvingSeat?: Seat,
  opts?: { isBounce?: boolean; insteadOnly?: boolean; playerAction?: boolean; isDigiXros?: boolean },
): Promise<Set<string>> {
  // Immediate reactions must observe the rebuilt continuous registry, never its
  // clear-before-refill interval during an overlapping effect-resolution flow.
  await engine.recomputeContinuousEffects();
  return consultLeavePrevention(
    {
      subTriggers: engine.subTriggers,
      keywordReplacements: (ids) => [
        ...detachLeaveReplacements(ids, {
          permanentById: (id) => engine.access.permanentById(id),
          hasDetach: (id) => engine.continuous.hasKeyword(id, "Detach"),
          traitTokens: (id) => {
            const permanent = engine.access.permanentById(id);
            if (permanent?.topCard === undefined) return [];
            const printed = detachTraitTokens(definitionOf(permanent.topCard));
            const granted = engine.continuous.keywordGrantSources(id, "Detach").flatMap((source) => {
              const definition = source.sourceCardId === undefined ? undefined : getCardDefinition(source.sourceCardId);
              return detachTraitTokens({ effectText: source.effectText ?? definition?.effectText });
            });
            return [...new Set([...printed, ...granted])];
          },
          definitionOf: (card) => definitionOf(card),
          trash: (paymentIds) => engine.primitives.trash(paymentIds),
        }),
        ...guardLeaveReplacements(
          [...engine.state.players].flatMap((player) => player.battleArea.map((permanent) => permanent.permanentId)),
          {
            idOffset: ids.length,
            permanentById: (id) => engine.access.permanentById(id),
            isBattleAreaDigimon: (permanent) => engine.access.isBattleAreaDigimon(permanent, engine.continuous),
            hasGuard: (id) => engine.continuous.hasKeyword(id, "Guard"),
          },
        ),
      ],
      permanentById: (id) => engine.access.permanentById(id),
      buildContext: (srcPerm, leavingId) =>
        buildEffectContext(engine, cardSourceOf(engine, srcPerm.topCard!), {
          deletedPermanentId: leavingId,
          deletedPermanentIds: permanentIds,
        }),
      buildInstanceContext: (sourceInstanceId, leavingId) => {
        const sourceInstance = findLooseInstance(engine, sourceInstanceId);
        return sourceInstance === undefined
          ? undefined
          : buildEffectContext(engine, cardSourceOf(engine, sourceInstance), {
              deletedPermanentId: leavingId,
              deletedPermanentIds: permanentIds,
            });
      },
      turnSeat: engine.state.turnSeat,
      // Once-per-turn prevention ledger (＜Barrier＞), keyed in the shared per-turn UseTracker
      // (reset at each turn start alongside every other Once-Per-Turn limit).
      oncePerTurnFired: (key) => engine.tracker.count(key, "replacement") > 0,
      markOncePerTurnFired: (key) => engine.tracker.register(key, "replacement"),
      // ＜Guard＞ is the one prevention keyword that resolves as a replacement subscription
      // rather than inline in the deletion paths, so its announcement is wired here.
      keywordPrevented: (activationIdentity, sourcePermanentId, sourceCardId, savedPermanentId) => {
        if (activationIdentity !== "keyword-guard") return;
        const saved = engine.access.permanentById(savedPermanentId);
        if (saved === undefined) return;
        engine.hooks.emit({
          kind: "deletionPrevented",
          keyword: "Guard",
          seat: saved.controllerSeat,
          permanentId: saved.permanentId,
          ...(saved.topCard === undefined ? {} : { cardId: saved.topCard.cardId }),
          ...(sourcePermanentId === undefined ? {} : { paidPermanentId: sourcePermanentId }),
          ...(sourceCardId === undefined ? {} : { paidCardId: sourceCardId }),
        });
      },
      orderReplacements: async (replacements, seat) => {
        // Each row has to name the card whose printed clause it is. A would-leave
        // replacement usually lives in the INHERITED box of a digivolution card, so the
        // permanent's top card is the wrong answer: it names a Digimon the clause is not
        // printed on. The source instance is carried alongside the key (`triggerCardIds`)
        // rather than parsed out of it, and the key is prefixed with that instance so two
        // copies of the same card under the same permanent stay separately addressable.
        const keyed = replacements.map((replacement) => {
          const sourceInstance =
            replacement.sourceInstanceId === undefined
              ? undefined
              : findLooseInstance(engine, replacement.sourceInstanceId);
          const sourcePermanent =
            replacement.sourcePermanentId === undefined
              ? undefined
              : engine.access.permanentById(replacement.sourcePermanentId);
          const cardId = sourceInstance?.cardId ?? sourcePermanent?.topCard?.cardId;
          const anchorInstanceId = sourceInstance?.instanceId ?? sourcePermanent?.topCard?.instanceId ?? "";
          // A clause printed on a card that is NOT the permanent's top card is being read
          // from the digivolution (or linked) cards, which is the inherited text box.
          const isInherited =
            sourceInstance !== undefined &&
            sourcePermanent !== undefined &&
            sourcePermanent.topCard?.instanceId !== sourceInstance.instanceId;
          return {
            replacement,
            cardId: cardId ?? replacement.sourceInstanceId ?? replacement.sourcePermanentId ?? "source",
            isInherited,
            key: buildTriggerKey(anchorInstanceId, `replacement/${replacement.id}/${cardId ?? "source"}`),
          };
        });
        const response = await engine.decisions.request({
          seat,
          kind: "orderTriggers",
          promptText: "Choose the order for simultaneous would-leave effects.",
          options: {
            triggerKeys: keyed.map(({ key }) => key),
            triggerCardIds: keyed.map(({ cardId }) => cardId),
            triggerDescriptions: keyed.map(({ replacement }) => replacement.description),
            triggerIsInherited: keyed.map(({ isInherited }) => isInherited),
          },
        });
        if (response.kind !== "orderTriggers" || response.order.length === 0) return replacements;
        const selected = keyed.find(({ key }) => key === response.order[0]);
        return selected === undefined
          ? replacements
          : [selected.replacement, ...replacements.filter((replacement) => replacement.id !== selected.replacement.id)];
      },
    },
    permanentIds,
    cause,
    resolvingSeat,
    {
      isBounce: opts?.isBounce,
      playerAction: opts?.playerAction,
      isDigiXros: opts?.isDigiXros,
      insteadOnly: opts?.insteadOnly,
      reentryGuard: engine.preventReentryGuard,
    },
  );
}

/**
 * Consult active digivolution-card-trash "redirect" replacements (subsystem:
 * delayed-and-rule-effects; BT10-084 Tactimon, KB Q2002-Q2008) for a trash operation about to
 * target `hostPermanentIds`. Delegates to the standalone `consultDigivolutionTrashRedirect`
 * (testable in isolation), supplying engine engine's registry, permanent lookup, and context
 * builder. Returns the redirected host id, or undefined when nothing changed.
 */
export function engineConsultDigivolutionTrashRedirect(
  engine: GameEngine,
  hostPermanentIds: string[],
): Promise<string | undefined> {
  return consultDigivolutionTrashRedirect(
    {
      subTriggers: engine.subTriggers,
      permanentById: (id) => engine.access.permanentById(id),
      buildContext: (srcPerm) => buildEffectContext(engine, cardSourceOf(engine, srcPerm.topCard!), {}),
    },
    hostPermanentIds,
  );
}

/**
 * Build the concrete effect Primitives bound to engine match (subsystem boundary:
 * effect-primitives owns the verbs, intent-protocol-and-room owns the decision
 * channel they call). The SelectionPort adapts the DecisionManager into the
 * seat-keyed form selection verbs use.
 */
export function buildPrimitives(engine: GameEngine): Primitives {
  // `combat` is assigned after the primitives are built (the controller is itself
  // wired with engine engine's fireTiming seam), so expose it lazily via a getter; the
  // attack verbs only dereference it at call time, by which point it is set.
  const getCombat = () => engine.combat;
  return createPrimitives({
    state: engine.state,
    artsDigivolve: (seat, instance, definition, duringAttack) =>
      engine.digivolveSupport.resolveArtsDigivolve(seat, instance, definition, duringAttack),
    beginEffectBody: () => {
      engine.effectResolutionDepth += 1;
    },
    finishEffectBody: () => {
      engine.effectResolutionDepth = Math.max(0, engine.effectResolutionDepth - 1);
    },
    drainPendingAttackTriggers: () => drainPendingAttackTriggers(engine),
    resolveAttackTimingWindow: async (drain) => {
      // An effect-directed attack pauses its enclosing effect bodies while the
      // attack's pending effects resolve. State-based rules run between those
      // effects, even though the enclosing card will resume after combat.
      const pausedDepth = engine.effectResolutionDepth;
      engine.effectResolutionDepth = 0;
      try {
        await flushDeferredTimingWindows(engine);
        parkDeferredSecurityRemovalTriggersForAttack(engine);
        await drain();
      } finally {
        engine.effectResolutionDepth = pausedDepth;
      }
    },
    // Called only from inside `runAttackSteps`, where the depth is already 0, so
    // `flushDeferredTimingWindows`'s own depth guard passes. `activeWindowToken` is
    // deliberately left set: ending the ordering effect's window here would discard the
    // pending pools it still needs after combat (Q3944).
    settleBetweenAttackSteps: () => settleBetweenEffects(engine),
    runAttackSteps: async (body) => {
      // CR §11-1: an attack ordered by an effect interrupts that effect. Triggers arising in
      // Counter Timing, the block window, the battle and End of Attack each resolve as their
      // own windows before the attack advances; the ordering effect resumes only afterwards.
      // Without this pause `shouldDeferNestedTiming` parks every one of those triggers in the
      // nested pending pool, where nothing drains them until the attack is already over
      // (a defender's Blast Digivolve [When Digivolving] resolving after combat).
      const pausedDepth = engine.effectResolutionDepth;
      engine.effectResolutionDepth = 0;
      try {
        await flushDeferredTimingWindows(engine);
        await body();
        await settleBetweenEffects(engine);
      } finally {
        engine.effectResolutionDepth = pausedDepth;
      }
    },
    baseGrantedDigivolve: (seat, base, evolving, sourceZone) =>
      engine.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
    emit: (event) => engine.hooks.emit(event),
    inSecurityCheck: () => engine.securityCheckDepth > 0,
    nextPermanentId: () => nextPermanentId(engine),
    nextInstanceId: () => nextInstanceId(engine),
    memory: engine.memory,
    modifiers: engine.modifiers,
    continuous: engine.continuous,
    subTriggers: engine.subTriggers,
    securityDp: engine.securityDp,
    deletionMaxDp: engine.deletionMaxDp,
    dpDeleteBudget: engine.dpDeleteBudget,
    win: engine.win,
    fireTiming: (timing, trigger) => fireTiming(engine, timing, trigger),
    resolveDeletionReactions: (trigger, candidates, transientCandidates = []) =>
      resolveDeletionReactions(
        engine,
        trigger,
        candidates,
        (deletionTrigger, simultaneousPending = []) =>
          simultaneousPending.length > 0
            ? runTimingWindow(
                engine,
                EffectTiming.OnDestroyedAnyone,
                deletionTrigger,
                transientCandidates,
                simultaneousPending,
              )
            : fireTiming(engine, EffectTiming.OnDestroyedAnyone, deletionTrigger, transientCandidates),
        transientCandidates,
      ),
    fireSubTrigger: (event, payload, sourceScope) => engine.fireSubTrigger(event, payload, sourceScope),
    trashTopSecurityForBarrier: (seat) => payBarrierSecurityCost(engine, seat),
    recomputeContinuousEffects: () => engine.recomputeContinuousEffects(),
    forgetCardUses: (instanceIds) => {
      for (const instanceId of instanceIds) engine.tracker.forgetInstance(instanceId);
    },
    processRulesBeforeWhenDigivolving: async () => {
      await engine.recomputeContinuousEffects();
      if (engine.ruleProcessing || engine.ruleTriggerPool !== undefined) {
        // A trash replacement is entered from the active rule pass. Run only the DP
        // movement processes: the outer pass owns the pooled reactions and its latch.
        await engine.ruleChecks.trashNoDpPermanents();
        await engine.ruleChecks.deleteZeroDpDigimon();
      } else {
        const pool = await collectRuleProcessMovements(engine);
        if (!engine.state.gameOver) await flushRuleTriggerPool(engine, pool);
      }
    },
    finalizeEffectPlayCost: async (instanceId, baseCost, useAsOption, originZone, projectOnly) => {
      // A selected security card can still be face down in its origin zone.
      // Locate only engine instance; do not expose hidden security to timing scans.
      const instance =
        originZone === "security"
          ? Array.from(engine.state.players)
              .flatMap((player) => Array.from(player.security))
              .find((card) => card.instanceId === instanceId)
          : findLooseInstance(engine, instanceId);
      return instance === undefined
        ? baseCost
        : fireBeforePayCost(engine, instance, baseCost, useAsOption, originZone, projectOnly);
    },
    prepareDigiXrosPlay: (instanceId) => prepareDigiXrosPlay(engine, instanceId),
    prepareDigiXrosPlays: (instanceIds) => prepareDigiXrosPlays(engine, instanceIds),
    playForKeywordEffect: (sourceInstanceId, instanceIds) =>
      playForKeywordEffect(engine, sourceInstanceId, instanceIds),
    finalizeEffectDigivolveCost: async (target, evolvingInstanceId, into, baseCost) => {
      const deps = digivolveDeps(engine);
      const adjusted = deps.adjustedDigivolveCost?.(engine.state, target, baseCost, into, { consumeOnce: true });
      const passiveCost = adjusted ?? baseCost;
      const interactiveReduction =
        (await deps.activateInteractiveDigivolveReduction?.(
          engine.state,
          target.controllerSeat,
          target,
          into,
          evolvingInstanceId,
        )) ?? 0;
      return Math.max(0, passiveCost - interactiveReduction);
    },
    effectiveLooseUseCost: (instanceId, controllerSeat) => projectLooseUseCost(engine, instanceId, controllerSeat),
    fireWhenLinking: async (instanceIds, targetPermanentId) => {
      for (const instanceId of instanceIds) {
        await fireTimingForInstance(engine, EffectTiming.OnLinking, instanceId, {
          subjectPermanentId: targetPermanentId,
          linkedInstanceIds: instanceIds,
        });
      }
    },
    resolveSelfWhenTrashedFromDeck: async (instanceId, byEffectCardId) => {
      const instance = findLooseInstance(engine, instanceId);
      if (instance === undefined) return;
      await resolveSelfWhenTrashedFromDeck(
        buildEffectContext(engine, cardSourceOf(engine, instance), {
          trashedFromDeckCardId: instance.cardId,
          ...(byEffectCardId === undefined ? {} : { trashedFromDeckByEffectCardId: byEffectCardId }),
        }),
      );
    },
    dnaDigivolveMemoryGains: (materialPermanentIds, into) =>
      engine.subTriggers.dnaMemoryGainsFor(materialPermanentIds, into),
    fireDiscardedFromSecurity: async (instanceIds) => {
      for (const instanceId of instanceIds) {
        await fireTimingForInstance(engine, EffectTiming.OnDiscardSecurity, instanceId);
      }
    },
    reactivateOnPlay: (permanentId, opts) => reactivateOnPlay(engine, permanentId, opts),
    fireEnteredByEffect: (timing, instanceId, ownerSeat, opts) =>
      fireEnteredByEffectTiming(engine, timing, instanceId, ownerSeat, opts),
    fireWhenDigivolving: (seat, permanent, previousLevel) =>
      digivolveDeps(engine).fireWhenDigivolving!(engine.state, seat, permanent, previousLevel),
    prepareAppFusion: async (seat, target, result, into) => {
      const deps = digivolveDeps(engine);
      await deps.prepareDigivolveCost?.(engine.state, seat, target, result, into);
    },
    appFusionTargetAllowed: (seat, target, result) => {
      const deps = digivolveDeps(engine);
      return (
        deps.digivolveBaseRestricted?.(engine.state, target, result) !== true &&
        deps.digivolveIntoAllowed?.(engine.state, target, result) !== false
      );
    },
    fireWouldDigivolve: (seat, target, into) =>
      digivolveDeps(engine).fireWouldDigivolve!(engine.state, seat, target, into),
    consultLeavePrevention: (ids, cause, resolvingSeat, opts) =>
      engine.consultLeavePrevention(ids, cause, resolvingSeat, opts),
    consultDigivolutionTrashRedirect: (ids) => engineConsultDigivolutionTrashRedirect(engine, ids),
    get combat() {
      return getCombat();
    },
    ask: {
      selectInstances: async (seat, candidateInstanceIds, min, max, promptText, provenance) => {
        const response = await engine.decisions.request({
          seat,
          kind: "selectCards",
          promptText,
          sourceCardId: provenance?.sourceCardId,
          sourceInstanceId: provenance?.sourceInstanceId,
          sourcePermanentId: provenance?.sourcePermanentId,
          options: {
            candidateInstanceIds,
            min,
            max,
            timing: provenance?.timing,
            effectText: provenance?.effectText,
            effectTextPart: provenance?.effectTextPart,
            isInherited: provenance?.isInherited,
            selectionContext: provenance?.selectionContext,
          },
        });
        return response.kind === "selectCards" ? response.instanceIds : [];
      },
    },
    controllerSeat: () => engine.state.turnSeat,
    inContinuousPass: () => inContinuousPass(engine),
    inResolvingWindow: () => engine.activeWindowToken !== undefined,
    barrierFired: (key) => engine.tracker.count(key, "replacement") > 0,
    markBarrierFired: (key) => engine.tracker.register(key, "replacement"),
    noteLinked: (instanceIds) => {
      for (const instanceId of instanceIds) engine.justLinked.add(instanceId);
    },
  });
}
