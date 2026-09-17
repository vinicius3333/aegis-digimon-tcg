import { isTimingActivationDisabled } from "../effects/timingActivation.js";
import { Zone, getCardDefinition, type CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
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
import type { GameEngine } from "../GameEngine.js";
import { detachLeaveReplacements, detachTraitTokens } from "../effects/detach.js";
import { guardLeaveReplacements } from "../effects/guard.js";
import { definitionOf } from "../cards/cardData.js";
import { consultLeavePrevention } from "../effects/leavePrevention.js";
import { consultDigivolutionTrashRedirect } from "../effects/digivolutionTrashRedirect.js";
import { findLooseInstance } from "./intents.js";
import { effectiveColorsOf } from "./matchLifecycle.js";

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
      keywordPrevented: (activationIdentity, sourcePermanentId, savedPermanentId) => {
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
        });
      },
      orderReplacements: async (replacements, seat) => {
        const keyed = replacements.map((replacement) => {
          const sourceInstance =
            replacement.sourceInstanceId === undefined
              ? undefined
              : findLooseInstance(engine, replacement.sourceInstanceId);
          return {
            replacement,
            key: `replacement/${replacement.id}/${sourceInstance?.cardId ?? replacement.sourceInstanceId ?? replacement.sourcePermanentId ?? "source"}`,
          };
        });
        const response = await engine.decisions.request({
          seat,
          kind: "orderTriggers",
          promptText: "Choose the order for simultaneous would-leave effects.",
          options: { triggerKeys: keyed.map(({ key }) => key) },
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
