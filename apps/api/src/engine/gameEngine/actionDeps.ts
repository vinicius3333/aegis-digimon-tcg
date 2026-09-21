import { EffectTiming, type CardInstance, type ServerEvent } from "@aegis/shared";
import { rollTurnActivity } from "../turnActivity.js";
import {
  lookupDefinition,
  definitionOf,
  isDigimon,
  isTamer,
  intrinsicDigivolutionCostReduction,
} from "../cards/cardData.js";
import { tamerOntoDigivolveLevel } from "../cards/tamerOntoDigivolve.js";
import { type IntentRouterDeps } from "../intentRouter.js";
import { type ActivateEffectDeps } from "../actions/activateEffect.js";
import { matchingDnaDigivolveCost } from "../effects/primitives.js";
import { effectiveKinds, effectiveNames } from "../effects/continuous.js";
import { digisorptionAmountFor } from "../cards/digisorptionDigivolve.js";
import { type ResolutionDeps } from "../effects/index.js";
import { effectsOf } from "../effects/collect.js";
import {
  applyWouldDigivolveSelfReducer,
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
  potentialWouldDigivolveSelfReduction,
  hasBlastDigivolveKeyword,
  digiXrosOnlyNameAliasesFor,
  universalNameAliasesFor,
} from "../effects/interpreter.js";
import type { CollectedEffect } from "../effects/collect.js";
import { type TurnFlowHooks } from "../TurnStateMachine.js";
import { logError } from "../../logger.js";
import { type BreedingDeps } from "../actions/breeding.js";
import {
  memoryDepsFromGauge,
  type DigivolveDeps,
  type PlayCardDeps,
  type DigiXrosDeps,
  type AssemblyDeps,
  type AttackDeps,
  type BlockDeps,
  type CombatDecisionDeps,
  type LinkCardDeps,
  type DnaDigivolveDeps,
  type RespondCounterDeps,
} from "../actions/index.js";
import { linkRequirementSatisfied } from "./boardQueries.js";
import { digivolvedFromTamerBase } from "./subTriggerIdentity.js";
import type { GameEngine } from "../GameEngine.js";
import { applyIntent, checkTurnEndAfterVerb, findInstance, findLooseInstance } from "./intents.js";
import {
  crossPermanentPlayReducerWatchers,
  fireBeforeDigivolveCost,
  fireBeforePayCost,
  firePlayEntryWindows,
  drainPendingOptionEntryTriggers,
  fireTimingForPermanent,
  projectLooseUseCost,
  residentPlayCostEffects,
} from "./timing.js";
import {
  nestedTriggerSourceStillResident,
  parkedEntryCollected,
  pendingWindowCollected,
  withPendingSubTriggers,
} from "./subTriggers.js";
import { listCandidateInstances, nextPermanentId, ruleProcess } from "./ruleProcess.js";
import { settleBetweenEffects } from "./windows.js";
import { buildEffectContext, cardSourceOf } from "./effectContext.js";
import { drawCards, runBreedingPhase, sweepDurations } from "./turnFlow.js";
import { effectiveColorsOf } from "./matchLifecycle.js";

/**
 * Engine-side dependencies for the stack resolver. `listCandidate` defaults to the
 * full candidate-zone enumeration ({@link listCandidateInstances}); a caller may
 * narrow it (e.g. fireTimingForInstance scopes to the one played card). `ruleProcess`
 * is the state-based-action fixpoint ({@link ruleProcess}); the resolver calls it
 */
export function resolutionDeps(
  engine: GameEngine,
  listCandidate: () => readonly CardInstance[] = () => listCandidateInstances(engine),
  opts: {
    outermost?: boolean;
    extraPending?: readonly CollectedEffect[];
    excludeNestedPending?: ReadonlySet<CollectedEffect>;
  } = {},
): ResolutionDeps {
  const excludeNestedPending = opts.excludeNestedPending;
  const pendingWhileOptionResolves = (): CollectedEffect[] => {
    const deferredPrintedEffects = new Set(engine.pendingNestedTimingEffects);
    return pendingWindowCollected(engine).filter((pending) => !deferredPrintedEffects.has(pending));
  };
  return {
    // The outermost loop settles deferred queues between effects. A nested resolver normally
    // cannot reach into the enclosing pool while its card body is still running; a settlement
    // window that starts at effect depth zero may opt into only entries added after its opening
    // snapshot, leaving the parent's older pending group to the outermost resolver.
    ...(opts.outermost === true
      ? {
          betweenEffects: () => settleBetweenEffects(engine),
          collectPending: () => [
            ...(engine.optionResolutionDepth > 0 ? pendingWhileOptionResolves() : pendingWindowCollected(engine)),
            ...(opts.extraPending ?? []),
          ],
        }
      : {
          collectPending: () => [
            ...(excludeNestedPending === undefined
              ? []
              : engine.optionResolutionDepth > 0
                ? pendingWhileOptionResolves()
                : engine.pendingNestedTimingEffects.filter(
                    (pending) =>
                      !excludeNestedPending.has(pending) && nestedTriggerSourceStillResident(engine, pending),
                  )),
            ...(engine.optionResolutionDepth > 0 ? [] : parkedEntryCollected(engine)),
            ...(opts.extraPending ?? []),
          ],
        }),
    turnSeat: engine.state.turnSeat,
    listCandidateInstances: listCandidate,
    ruleProcess: () =>
      engine.optionResolutionDepth > 0 || engine.effectResolutionDepth > 0 ? Promise.resolve() : ruleProcess(engine),
    isGameOver: () => engine.state.gameOver,
    chooseOrder: (seat, active, timing) => engine.resolverDecisions.chooseOrder(seat, active, timing),
    askOptional: (seat, collected) => engine.resolverDecisions.askOptional(seat, collected),
    onResolving: (timing, collected) => {
      // A deferred trigger belongs to its original event, not every nested resolver that
      // can see engine pending pool. Retire it before its body can open another window.
      engine.pendingNestedTimingEffects = engine.pendingNestedTimingEffects.filter((pending) => pending !== collected);
      engine.hooks.emit({
        kind: "effectTriggered",
        seat: collected.source.ownerSeat,
        sourceCardId: collected.source.cardId,
        sourceInstanceId: collected.source.instanceId,
        sourcePermanentId: collected.conferredToPermanentId ?? collected.source.permanent()?.permanentId,
        effectKey: collected.effect.effectKey,
        description: collected.effect.description,
        timing: collected.timingLabel ?? EffectTiming[collected.timing ?? timing],
        ...(collected.printedTiming !== undefined || collected.effect.irTrigger !== undefined
          ? { printedTiming: collected.printedTiming ?? collected.effect.irTrigger }
          : {}),
        ...(collected.effect.isInherited ? { isInherited: true } : {}),
        // `securityChecked` closes the check AFTER these effects have resolved, so the
        // client needs engine to hold the announcement until the reveal has been shown.
        ...(engine.securityCheckDepth > 0 ? { duringSecurityCheck: true } : {}),
      });
    },
    onResolved: (timing, collected) => {
      engine.hooks.emit({
        kind: "effectResolved",
        seat: collected.source.ownerSeat,
        sourceCardId: collected.source.cardId,
        sourceInstanceId: collected.source.instanceId,
        sourcePermanentId: collected.conferredToPermanentId ?? collected.source.permanent()?.permanentId,
        effectKey: collected.effect.effectKey,
        description: collected.effect.description,
        timing: collected.timingLabel ?? EffectTiming[collected.timing ?? timing],
        ...(collected.effect.isInherited ? { isInherited: true } : {}),
      });
    },
  };
}

/** Dependencies the breeding verbs need (subsystem: deck-and-setup / breeding). */
export function breedingDeps(engine: GameEngine): BreedingDeps {
  return {
    nextPermanentId: () => nextPermanentId(engine),
    // Seat-level "your opponent can't move <X>" prohibition (RestrictPlay). Moving out of
    // the breeding area is the moving seat's own action (KB EX7-014 Q3835/Q6509).
    moveProhibited: (_state, seat, definition) => engine.continuous.isPlayBlocked(seat, definition, "move"),
    emit: (event) => engine.hooks.emit(event as ServerEvent),
  };
}

/**
 * Assemble the side-effect dependencies the digivolve action needs (subsystem:
 * digivolve). Memory math is delegated to the shared MemoryGauge (its single
 * owner); draw uses the interim draw primitive; the When Digivolving timing is
 * fired through the effect stack; narration is forwarded to the room.
 */
export function digivolveDeps(engine: GameEngine): DigivolveDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    recomputeDP: (state, permanentId) => engine.modifiers.recomputeDP(state, permanentId),
    reanchorGrantedEffects: (priorTopInstanceId, newTopInstanceId) =>
      engine.continuous.reanchorCustomEffectGrants(priorTopInstanceId, newTopInstanceId),
    // Apply active continuous digivolution-cost modifiers (changeEvoCost) to the
    // printed evolve cost: a `fixed` adjustment sets an absolute cost, otherwise the
    // delta sums; floored at 0 (Official Rule Manual: a cost can't go below 0).
    adjustedDigivolveCost: (_state, target, base, into, opts) => {
      const reductionsBlocked = engine.continuous.blocksCostReduction(target.controllerSeat, "digivolve");
      let cost = base;
      const intrinsicAlreadyApplied = engine.modifiers.hasIntrinsicEvoCostAdjustment(target, into);
      const adj = engine.modifiers.evoCostFor(target, into, opts);
      if (adj !== undefined) {
        cost = "fixed" in adj ? adj.fixed : cost + adj.delta;
      }
      const replReduction = engine.subTriggers.costReductionFor("wouldDigivolve", target, into, {
        consume: opts?.consumeOnce === true,
        hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
        markFired: (key) => engine.tracker.register(key, "replacement"),
      });
      // The shared intrinsic projection is a fallback, not a second copy of a live IR reduction.
      const intrinsicReduction = intrinsicAlreadyApplied ? 0 : intrinsicDigivolutionCostReduction(into, target);
      return Math.max(0, cost - (reductionsBlocked ? 0 : replReduction + intrinsicReduction));
    },
    deferAffordabilityForWouldDigivolve: (_state, _seat, target, into) => {
      for (const replacement of engine.subTriggers.replacementsFor("wouldDigivolve")) {
        if (replacement.mode !== "instead" || replacement.sourcePermanentId === undefined) continue;
        const sourcePermanent = engine.access.permanentById(replacement.sourcePermanentId);
        if (sourcePermanent?.topCard === undefined) continue;
        const ctx = buildEffectContext(engine, cardSourceOf(engine, sourcePermanent.topCard), {
          subjectPermanentId: target.permanentId,
          digivolvingIntoCardId: into.cardId,
        });
        if (replacement.appliesTo !== undefined && !replacement.appliesTo(ctx, target.permanentId)) continue;
        return true;
      }
      return false;
    },
    prepareDigivolveCost: (_state, _seat, target, evolving) => fireBeforeDigivolveCost(engine, evolving, target),
    potentialInteractiveDigivolveReduction: (state, seat, target, into) => {
      if (engine.continuous.blocksCostReduction(seat, "digivolve")) return 0;
      const liveReduction = engine.subTriggers.potentialInteractiveReductionFor("wouldDigivolve", seat, target, into, {
        hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
        markFired: (key) => engine.tracker.register(key, "replacement"),
      });
      const evolving = state.players[seat]?.hand.find(({ cardId }) => cardId === into.cardId);
      if (evolving === undefined) return liveReduction;
      const ctx = buildEffectContext(engine, cardSourceOf(engine, evolving), {});
      const intrinsicReduction = wouldDigivolveSelfReducersFor(into.cardId).reduce(
        (total, reducer) => total + potentialWouldDigivolveSelfReduction(ctx, reducer, target),
        0,
      );
      return liveReduction + intrinsicReduction;
    },
    activateInteractiveDigivolveReduction: async (_state, seat, target, into, evolvingInstanceId) => {
      if (engine.continuous.blocksCostReduction(seat, "digivolve")) return 0;
      const liveReduction = await engine.subTriggers.activateInteractiveReductionsFor(
        "wouldDigivolve",
        seat,
        target,
        into,
        evolvingInstanceId,
        (sourcePermanentId, sourceInstanceId) => {
          const source = engine.access.permanentById(sourcePermanentId);
          return source?.topCard === undefined
            ? undefined
            : buildEffectContext(
                engine,
                cardSourceOf(engine, findInstance(engine, sourceInstanceId ?? "")?.instance ?? source.topCard),
                {},
              );
        },
        {
          hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
          markFired: (key) => engine.tracker.register(key, "replacement"),
        },
      );
      const evolving = findLooseInstance(engine, evolvingInstanceId);
      if (evolving === undefined) return liveReduction;
      const ctx = buildEffectContext(engine, cardSourceOf(engine, evolving), {});
      ctx.activeTiming = "Static";
      ctx.activeEffectText = ctx.source.definition.effectText;
      let intrinsicReduction = 0;
      for (const reducer of wouldDigivolveSelfReducersFor(into.cardId)) {
        intrinsicReduction += await applyWouldDigivolveSelfReducer(ctx, reducer, target);
      }
      return liveReduction + intrinsicReduction;
    },
    // Color-requirement waiver at the digivolve site (WaiveColorRequirement, LOCKED Q3):
    // when the evolving instance is waived, the EvoCost is matched on level alone. This is
    // the consuming read of the color-waiver store on the digivolve path. BUT while a
    // "players can't ignore digivolution requirements" rule (BT8-059) is active for the
    // digivolving seat, ignoring the color requirement is itself an ignored requirement
    // (KB Q1741: "players can't ignore part of the digivolution requirements such as
    // levels") — so the waiver is suppressed and the color test is re-enforced. This is the
    // consuming read of `cannotIgnoreDigivolution` (WR-01).
    colorWaived: (state, instance) =>
      engine.continuous.hasColorWaiver(instance.instanceId) &&
      !engine.continuous.cannotIgnoreDigivolution(state.turnSeat),
    // The base permanent's effective colors (printed ∪ continuously-derived) gate the
    // EvoCost color test (static-continuous-effects, LOCKED Q4 — KB BT3-040 Q1075). The
    // continuous tier is recomputed before each fired timing, so the store is current.
    derivedBaseColors: (_state, permanent) => effectiveColorsOf(engine, permanent),
    effectiveBaseKinds: (_state, permanent) =>
      effectiveKinds(engine.continuous, permanent.permanentId, definitionOf(permanent.topCard)?.kinds ?? []),
    // Positive "can only digivolve into [X]" constraint (EX10-035 digivolveExceptInto): consult
    // the continuous ledger with the evolving card's definition; reject a non-matching target.
    digivolveIntoAllowed: (_state, permanent, evolving) =>
      engine.continuous.digivolveIntoAllowed(
        permanent.permanentId,
        lookupDefinition(evolving.cardId) ?? cardSourceOf(engine, evolving).definition,
      ),
    // consuming read of the digivolve-restriction store at the digivolve site.
    digivolveBaseRestricted: (_state, permanent, evolving) => {
      if (engine.continuous.hasRestriction(permanent.permanentId, "digivolve")) return true;
      const evolvingDefinition = lookupDefinition(evolving.cardId) ?? cardSourceOf(engine, evolving).definition;
      if (
        evolvingDefinition.level === 7 &&
        engine.continuous.hasRestriction(permanent.permanentId, "digivolveToLevel7")
      ) {
        return true;
      }
      if (permanent.isSuspended) return false;
      if (!engine.continuous.isUnsuspendedDigivolveProhibited(permanent.controllerSeat)) return false;
      const base = permanent.topCard === undefined ? undefined : definitionOf(permanent.topCard.cardId);
      if (base === undefined) return false;
      return isDigimon(base) || (isTamer(base) && tamerOntoDigivolveLevel(evolving.cardId) !== undefined);
    },
    // Alternate-requirement non-memory placement cost (BT7-112): availability gate + payment.
    // Generic over `placementCost` (kind ∈ kinds OR trait ∈ traits, across hand/trash).
    alternatePlacementPayable: (_state, seat, requirement) =>
      engine.digivolveSupport.placementCostCards(seat, requirement).length >= (requirement.placementCost?.count ?? 0),
    payAlternatePlacement: async (_state, seat, requirement, evolving) => {
      const need = requirement.placementCost?.count ?? 0;
      const candidates = engine.digivolveSupport
        .placementCostCards(seat, requirement)
        .filter((c) => c.instanceId !== evolving.instanceId);
      if (candidates.length < need) return false;
      // KB BT7-112 Q1691: the player chooses WHICH matching cards to place; the selection
      // order is the bottom-of-deck order ("in any order").
      const ctx = buildEffectContext(engine, cardSourceOf(engine, evolving), {});
      const chosen = await engine.decisionApi.selectCards(ctx, {
        candidates: candidates.map((c) => c.instanceId),
        min: need,
        max: need,
      });
      // Empty/short response (decision timeout safe-default): fall back to the deterministic
      // hand-then-trash pick — payment is mandatory once the alternate path was chosen (Q1681).
      const ids = chosen.length === need ? chosen : candidates.slice(0, need).map((c) => c.instanceId);
      await engine.primitives.returnToDeck(ids, { toTop: false });
      return true;
    },
    // Burst Digivolve's non-memory Tamer-return cost (§8-3-3-2): availability gate + payment.
    burstDigivolveTamerPayable: (_state, seat, requirement) =>
      engine.digivolveSupport.burstDigivolveTamerCandidates(seat, requirement).length > 0,
    payBurstDigivolveTamer: async (_state, seat, requirement) => {
      const target = engine.digivolveSupport.burstDigivolveTamerCandidates(seat, requirement)[0];
      if (target?.topCard === undefined) return false;
      const moved = await engine.primitives.returnToHand([target.topCard.instanceId]);
      return moved.length > 0;
    },
    // ＜Digisorption -N＞ availability for the affordability gate (Comprehensive Rules §16-10):
    // N when the card being digivolved into has ＜Digisorption＞ AND at least one Digimon is
    // suspendable to pay it (the controller's own, or — while an eligible BT3-056 redirector is
    // on the controller's battle area engine turn — an opponent's). Pure read; no prompt/suspend.
    digisorptionReduction: (_state, seat, intoCardId) => {
      if (engine.continuous.blocksCostReduction(seat, "digivolve")) return 0;
      const amount = digisorptionAmountFor(intoCardId);
      if (amount === undefined) return 0;
      return engine.digivolveSupport.digisorptionSuspendCandidates(seat).length >= 1 ? amount : 0;
    },
    payDigisorption: (_state, seat, into, target) => engine.digivolveSupport.payDigisorption(seat, into, target),
    fireWouldDigivolve: async (_state, _seat, target, into) => {
      // A would-digivolve watcher may be anchored to another permanent (EX2-056 Takato)
      // while applying to the Digimon that declared the evolution. Gather the whole event
      // window and let each replacement's `appliesTo` predicate gate the target.
      const replacements = engine.subTriggers.replacementsFor("wouldDigivolve");
      for (const replacement of replacements) {
        if (replacement.mode !== "instead" || replacement.sourcePermanentId === undefined) continue;
        const sourcePermanent = engine.access.permanentById(replacement.sourcePermanentId);
        if (sourcePermanent?.topCard === undefined) continue;
        const ctx = buildEffectContext(engine, cardSourceOf(engine, sourcePermanent.topCard), {
          subjectPermanentId: target.permanentId,
          digivolvingIntoCardId: into.cardId,
        });
        if (replacement.appliesTo && !replacement.appliesTo(ctx, target.permanentId)) continue;
        await replacement.apply(ctx);
      }
    },
    // Base-granted digivolve path (ST7-03/BT6-060): the base permanent's static grant lets engine
    // specific evolving card digivolve onto it, ignoring color/level, when active (battle area,
    // the grant's allowed turns and its printed condition when present).
    baseGrantedDigivolve: (_state, seat, base, evolving, sourceZone) =>
      engine.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
    // ＜Blast Digivolve＞/＜Blast DNA Digivolve＞ (§16-26-1/§16-31-1): the evolving hand card's
    // own printed keyword, read from the compiled-IR side registry (registerIrCard populates it
    // via registerBlastDigivolveFromEffects) since the card is in hand, not a live permanent.
    costWaived: (_state, instance) => hasBlastDigivolveKeyword(instance.cardId),
    blastWindowAllowed: (_state, seat) =>
      engine.combat.hasOpenCounterWindow && engine.combat.counterWindowSeat === seat,
    draw: (_state, seat, count) => drawCards(engine, seat, count),
    fireWhenDigivolving: async (_state, seat, permanent, previousLevel, baseWasDigimon) => {
      // Turn-scoped fact consumed by inherited effects such as BT1-007. Register before
      // firing When Digivolving so effects in that window can observe the completed evolution.
      // Effects do not inspect the breeding area unless their text explicitly says so (BT1-007
      // Q870), therefore a breeding-area evolution must not set engine battle-area fact.
      if (!permanent.inBreeding) {
        engine.tracker.register(`seat:${seat}`, "digivolvedThisTurn");
      }
      // Scope [When Digivolving] to the permanent that just digivolved (its top card
      // plus inherited stack effects). A global fire would also collect and resolve
      // every OTHER permanent's [When Digivolving] effect — including the opponent's
      // — because those effects rely on the engine (not a per-card owner's-turn guard)
      // to be scoped to the digivolving card.
      // One digivolution, one set of simultaneous triggers: the evolving card's own
      // [When Digivolving], the board-wide enter-field window, and every "when your Digimon
      // digivolves" watcher. They reach the resolver as ONE pool, so the controller orders
      // all of them in a single prompt — Destromon's own [When Digivolving] against the two
      // Xeno EX11-066 watchers, for example — instead of the printed effects always
      // resolving before the watchers.
      // Q6671/Q6708: a Tamer base digivolves as a Tamer, not as a Digimon. The watcher events
      // still fire — "when one of your Tamers digivolves" (BT7-081) and "when your Digimon or
      // Tamers digivolve" (BT18-010) are real triggers — but the payload is tagged so the
      // SubTrigger gate withholds plain "when a Digimon digivolves" watchers. The caller's
      // report reads EFFECTIVE kinds, so a Tamer currently treated as a Digimon is not tagged
      // and keeps every watcher; a Digi-Egg base is not a Tamer and is never tagged.
      const fromTamer = digivolvedFromTamerBase(permanent);
      const tamerDigivolved = fromTamer && baseWasDigimon !== true;
      const digivolveTrigger = {
        subjectPermanentId: permanent.permanentId,
        previousDigivolutionLevel: previousLevel,
        ...(fromTamer ? { digivolvedFromTamer: true } : {}),
        ...(tamerDigivolved ? { tamerDigivolved: true } : {}),
      };
      await withPendingSubTriggers(
        engine,
        ["whenOneOfYoursDigivolves", "whenAnyDigivolves"],
        digivolveTrigger,
        async () => {
          // Scope [When Digivolving] to the permanent that just digivolved (its top card
          // plus inherited stack effects). A global fire would also collect and resolve
          // every OTHER permanent's [When Digivolving] effect — including the opponent's
          // — because those effects rely on the engine (not a per-card owner's-turn guard)
          // to be scoped to the digivolving card.
          await fireTimingForPermanent(engine, EffectTiming.WhenDigivolving, permanent, digivolveTrigger);
          // Thread the digivolving permanent as the trigger subject (documented behavior: the
          // enter-field hashtable carries the entered permanent). An OnEnterFieldAnyone effect
          // that targets "the Digimon that digivolved" (BT19-080) reads
          // ctx.trigger.subjectPermanentId; it was previously undefined here, leaving such
          // effects silently inert.
          await engine.fireTiming(EffectTiming.OnEnterFieldAnyone, {
            ...digivolveTrigger,
            entryCause: "digivolve",
          });
          await engine.fireSubTrigger("onEnterFieldAnyone", {
            ...digivolveTrigger,
            entryCause: "digivolve",
          });
        },
      );
    },
    emit: (event) => engine.hooks.emit(event as ServerEvent),
  };
}

/**
 * Assemble the side-effect dependencies the play-card action needs (subsystem:
 * play-card). Memory math is delegated to the shared MemoryGauge (its single
 * owner, identical binding to digivolve); the On Play / option timing is fired
 * through the effect stack scoped to the played instance; permanent ids come from
 * the engine's allocator; narration is forwarded to the room.
 */
export function playCardDeps(engine: GameEngine): PlayCardDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    // Apply active continuous play-cost modifiers (CostModifier play/use forms) to the
    // printed cost. The recompute runs before each fired timing, so the store is
    // current when a play is validated. `controllerSeat` is the seat paying.
    adjustedPlayCost: (_state, seat, definition, base) =>
      engine.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
    optionUseCost: (_state, seat, instance, passiveCost) =>
      projectLooseUseCost(engine, instance.instanceId, seat) ?? passiveCost,
    // Seat-level "your opponent can't play <X>" prohibition (RestrictPlay). A manual play
    // is the playing seat's own action, so the prohibition on that seat applies.
    playProhibited: (_state, seat, definition) => engine.continuous.isPlayBlocked(seat, definition, "play"),
    // MINIMAL color-requirement legality gate (CONTEXT.md LOCKED Q3): the printed color
    // requirement must overlap the seat's available colors, UNLESS WaiveColorRequirement
    // has waived engine instance — `continuous.hasColorWaiver` is the consuming read that
    // makes the waiver observable. Deliberately not the full color subsystem (Phase 4).
    colorRequirementMet: (_state, seat, instance, definition, mode) =>
      engine.continuous.hasColorWaiver(instance.instanceId) ||
      engine.digivolveSupport.printedColorRequirementMet(
        seat,
        definition,
        mode,
        engine.continuous.colorRequirementAlternatives(instance.instanceId),
      ),
    nextPermanentId: () => nextPermanentId(engine),
    recomputeDP: (permanentId) => engine.modifiers.recomputeDP(engine.state, permanentId),
    // Pay-time interactive cost reduction (BeforePayCost): fire the played card's BeforePayCost
    // window (where a ReducePlayCost action runs its optional server-side payment) and return the
    // finalized cost. Runs in the async apply path BEFORE memory is paid (EX9-043 / BT25-076).
    finalizePlayCost: async (_state, _seat, instance, _definition, baseCost, mode) =>
      fireBeforePayCost(engine, instance, baseCost, mode === "option", "hand"),
    // Synchronous fast-path gate: only cards with a BeforePayCost effect take the async
    // finalization path. Every other card keeps same-microtask placement (no timing change).
    hasBeforePayCost: (instance) =>
      effectsOf(EffectTiming.BeforePayCost, cardSourceOf(engine, instance)).some(
        (effect) => effect.costWindow !== "digivolve",
      ) ||
      wouldBePlayedSelfReducersFor(instance.cardId).length > 0 ||
      (engine.state.players[cardSourceOf(engine, instance).ownerSeat]?.breeding?.stack.length ?? 0) > 0 ||
      crossPermanentPlayReducerWatchers(engine, instance, cardSourceOf(engine, instance).ownerSeat).length > 0 ||
      residentPlayCostEffects(engine, cardSourceOf(engine, instance).ownerSeat).length > 0 ||
      engine.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", cardSourceOf(engine, instance).ownerSeat),
    // After the played permanent is created (before On Play), place any cards a cross-permanent
    // reducer (BT10-093) committed under it, and relocate any whole permanent a SELF reducer's cost
    // body (BT12-112) selected to become one of its digivolution cards. No-op when nothing was
    // committed/selected for engine play.
    placePendingDigivolution: async (playedInstanceId, permanentId) => {
      const ids = engine.pendingPlayReducerPlacements.get(playedInstanceId);
      if (ids !== undefined && ids.length > 0) {
        engine.pendingPlayReducerPlacements.delete(playedInstanceId);
        await engine.primitives.placeUnder(permanentId, ids);
      }
      const relocations = engine.pendingSelfReducerRelocations.get(playedInstanceId);
      if (relocations !== undefined && relocations.length > 0) {
        engine.pendingSelfReducerRelocations.delete(playedInstanceId);
        for (const relocation of relocations) {
          const opts = {
            belowTop: true,
            ...(relocation.shedOwnCards === true ? { shedOwnCards: true } : {}),
          };
          if (engine.primitives.relocatePermanentByEffect !== undefined) {
            await engine.primitives.relocatePermanentByEffect(permanentId, relocation.permanentId, opts);
          } else {
            engine.primitives.relocatePermanent(permanentId, relocation.permanentId, opts);
          }
        }
      }
    },
    fireTiming: async (_state, _seat, timing, sourceInstanceId) =>
      firePlayEntryWindows(engine, timing, sourceInstanceId),
    beginOptionResolution: () => {
      engine.optionResolutionDepth += 1;
    },
    finishOptionResolution: async () => {
      if (engine.optionResolutionDepth === 1) {
        await ruleProcess(engine);
        engine.optionResolutionDepth = 0;
        await drainPendingOptionEntryTriggers(engine);
      } else {
        engine.optionResolutionDepth = Math.max(0, engine.optionResolutionDepth - 1);
      }
    },
    fireOptionUsed: async (usedInstanceId, usedOptionCost) =>
      engine.primitives.fireOptionUsed(usedInstanceId, usedOptionCost),
    // CR §4-19 Arts Digivolve (Task 4): a rule on DUAL cards, not a per-card effect —
    // see `resolveArtsDigivolve` below for the eligibility + decision + commit steps.
    artsDigivolve: async (_state, seat, instance, definition) =>
      engine.digivolveSupport.resolveArtsDigivolve(seat, instance, definition),
    emit: (event) => engine.hooks.emit(event as ServerEvent),
  };
}

/**
 * Dependencies the attack verb needs (subsystem: attack-and-block). The shared
 * state-access layer and the single CombatController instance back it; a fatal
 * error from the async combat continuation is surfaced to the room as an
 * actionRejected entry rather than an unhandled rejection.
 */
export function attackDeps(engine: GameEngine): AttackDeps {
  return {
    state: engine.state,
    access: engine.access,
    combat: engine.combat,
    continuous: engine.continuous,
    attackedThisTurn: engine.combat.attackedThisTurn,
    onCombatComplete: () => checkTurnEndAfterVerb(engine),
    onCombatError: (err) => {
      logError("[engine] combat resolve failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "attack",
        reason: err instanceof Error ? err.message : "combat-error",
      });
      // A combat that died mid-resolution already released the controller's guards
      // (resolveAttack's finally), but it skipped onCombatComplete — and with it the
      // turn-end check. If an effect pushed memory across before the throw, no later
      // verb is legal to re-trigger that check, so the Main phase would hang open
      // until a manual endPhase (field bug: api.log 2026-08-20, BT21-021).
      engine.projection.syncAttackTargets();
      engine.projection.syncHandAffordances();
      checkTurnEndAfterVerb(engine);
    },
  };
}

/** Dependencies the block verbs need (subsystem: attack-and-block). */
export function blockDeps(engine: GameEngine): BlockDeps {
  return { state: engine.state, access: engine.access, combat: engine.combat, continuous: engine.continuous };
}

export function combatDecisionDeps(engine: GameEngine): CombatDecisionDeps {
  return { state: engine.state, access: engine.access, combat: engine.combat };
}

/** Assemble the non-combat verb router's dependencies (subsystem: intent-protocol-and-room). */
export function intentRouterDeps(engine: GameEngine): IntentRouterDeps {
  return {
    state: engine.state,
    win: engine.win,
    decisions: engine.decisions,
    mainPhase: engine.mainPhase,
    markReady: (seat) => {
      engine.readySeats.add(seat);
      const bothReady = engine.readySeats.size >= 2;
      if (bothReady && !engine.bothReadyFired) {
        engine.bothReadyFired = true;
        engine.hooks.onBothReady?.();
      }
      return bothReady;
    },
  };
}

/** Dependencies the respondCounter verb needs (subsystem: attack-and-block). */
export function respondCounterDeps(engine: GameEngine): RespondCounterDeps {
  return {
    combat: engine.combat,
    findInstance: (instanceId) => findInstance(engine, instanceId),
    cardSourceOf: (instance) => cardSourceOf(engine, instance),
    // A player-activated [Counter] ability has no incoming trigger payload (it is
    // not reacting to another event), so the TriggerInfo is empty — same as
    // activateEffectDeps.makeContext.
    makeContext: (source, _effect) => buildEffectContext(engine, source, {}),
    tracker: engine.tracker,
  };
}

/** Dependencies the activateEffect verb needs (subsystem: intent-protocol-and-room). */
export function activateEffectDeps(engine: GameEngine): ActivateEffectDeps {
  return {
    findInstance: (instanceId) => findInstance(engine, instanceId),
    cardSourceOf: (instance) => cardSourceOf(engine, instance),
    activationEffectsFor: (instance) => engine.projection.activatableEffectsFor([instance]),
    // A directly-activated [Main] ability has no incoming trigger payload (it is
    // not reacting to another event), so the TriggerInfo is empty. It still carries
    // the named effect's provenance because every nested decision must render engine
    // exact [Main]/Delay clause rather than guessing from the card's first text box.
    makeContext: (source, effect, conferredToPermanentId, conferralGranterInstanceId) =>
      engine.projection.activationContext({
        source,
        effect,
        ...(conferredToPermanentId === undefined ? {} : { conferredToPermanentId }),
        ...(conferralGranterInstanceId === undefined ? {} : { conferralGranterInstanceId }),
      }),
    tracker: engine.tracker,
    enterEffectResolution: (seat, sourceKinds, sourcePermanentId) =>
      engine.primitives.enterEffectResolution?.(seat, sourceKinds, sourcePermanentId),
    leaveEffectResolution: () => engine.primitives.leaveEffectResolution?.(),
  };
}

/**
 * Side-effect dependencies for the DigiXros play subsystem. Memory math is the shared gauge
 * (identical to playCard / digivolve); placement and suspension are delegated to the canonical
 * primitives; On Play fires through the effect stack scoped to the played instance, plus the
 * board-wide OnEnterFieldAnyone / whenPlayed seams (mirroring playCardDeps.fireTiming).
 */
export function digiXrosDeps(engine: GameEngine): DigiXrosDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    adjustedPlayCost: (_state, seat, definition, base) =>
      engine.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
    canReducePlayCost: (_state, seat) => !engine.continuous.blocksCostReduction(seat, "play"),
    finalizePlayCost: async (_state, _seat, instance, _definition, baseCost) =>
      fireBeforePayCost(engine, instance, baseCost, false, "hand"),
    digiXrosNamesOf: (instanceId) => {
      const located = findInstance(engine, instanceId);
      if (located === undefined) return [];
      const aliases = [
        ...universalNameAliasesFor(located.instance.cardId),
        ...digiXrosOnlyNameAliasesFor(located.instance.cardId),
      ];
      if (located.permanent === undefined) return aliases;
      return [
        ...new Set([
          ...aliases,
          ...engine.continuous.grantedNames(located.permanent.permanentId),
          ...engine.continuous.grantedDigiXrosNames(located.permanent.permanentId),
        ]),
      ];
    },
    canSubstituteMaterial: (permanentId) => engine.continuous.hasKeyword(permanentId, "DigiXrosSubstitute"),
    digiXrosExpandedZones: (seat, playedInstanceId) =>
      engine.primitives.digiXrosExpandedZones?.(seat, playedInstanceId) ?? [],
    digiXrosExpandedZoneCounts: (seat, playedInstanceId) =>
      engine.primitives.digiXrosExpandedZoneCounts?.(seat, playedInstanceId) ?? {},
    nextPermanentId: () => nextPermanentId(engine),
    placeUnder: (targetPermanentId, instanceIds) => engine.primitives.placeUnder(targetPermanentId, instanceIds),
    placePendingDigivolution: playCardDeps(engine).placePendingDigivolution,
    relocatePermanent: (destPermanentId, sourcePermanentId, opts) =>
      engine.primitives.relocatePermanent(destPermanentId, sourcePermanentId, opts),
    relocatePermanentForDigiXros: async (destPermanentId, sourcePermanentId, opts) => {
      const prevented = await engine.consultLeavePrevention([sourcePermanentId], "byEffect", undefined, {
        playerAction: true,
        isDigiXros: true,
        isBounce: true,
      });
      if (prevented.has(sourcePermanentId)) return false;
      return engine.primitives.relocatePermanent(destPermanentId, sourcePermanentId, opts);
    },
    suspendPermanent: async (permanentId) => {
      await engine.primitives.suspend([permanentId]);
    },
    fireTiming: async (_state, _seat, timing, sourceInstanceId, materialCount) =>
      firePlayEntryWindows(engine, timing, sourceInstanceId, { digiXrosMaterialCount: materialCount }),
    emit: (event) => engine.hooks.emit(event as ServerEvent),
  };
}

/**
 * Side-effect dependencies for the Assembly play subsystem (§7-3). Memory math is the shared
 * gauge (identical to playCard / DigiXros / digivolve); placement is delegated to the canonical
 * `placeUnder` primitive; On Play fires through the effect stack scoped to the played instance,
 * plus the board-wide OnEnterFieldAnyone / whenPlayed seams (mirroring digiXrosDeps.fireTiming).
 */
export function assemblyDeps(engine: GameEngine): AssemblyDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    adjustedPlayCost: (_state, seat, definition, base) =>
      engine.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
    nextPermanentId: () => nextPermanentId(engine),
    placeUnder: (targetPermanentId, instanceIds) => engine.primitives.placeUnder(targetPermanentId, instanceIds),
    fireTiming: async (_state, _seat, timing, sourceInstanceId) =>
      firePlayEntryWindows(engine, timing, sourceInstanceId),
    emit: (event) => engine.hooks.emit(event as ServerEvent),
  };
}

/**
 * Dependencies the linkCard verb needs (subsystem: link). The memory gauge is the
 * same seam digivolve uses; `linkRequirementSatisfied` reuses engine engine's own
 * §17-1-3-2-6/7 rule-check predicate so declaration-time legality and the ongoing
 * sweep can never disagree; `link` delegates the actual plug-in to the existing
 * Link primitive (effects/primitives.ts).
 */
export function linkCardDeps(engine: GameEngine): LinkCardDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    payMemory: mem.payMemory,
    linkRequirementSatisfied: (hostDefinition, linkedCard) => linkRequirementSatisfied(hostDefinition, linkedCard),
    linkCostReduction: (targetPermanentId, traits) =>
      engine.continuous.linkCostReductionGrant(
        targetPermanentId,
        traits,
        (key) => engine.tracker.count(`link-cost/${key}`, "replacement") > 0,
      )?.amount ?? 0,
    resolveLinkCostReduction: async (targetPermanentId, traits) => {
      const grant = engine.continuous.linkCostReductionGrant(
        targetPermanentId,
        traits,
        (key) => engine.tracker.count(`link-cost/${key}`, "replacement") > 0,
      );
      if (grant === undefined) return 0;
      if (grant.optional === true) {
        const response = await engine.decisions.request({
          seat: grant.controllerSeat ?? engine.state.turnSeat,
          kind: "optional",
          promptText: `Reduce engine Link cost by ${grant.amount}?`,
          sourceCardId: grant.sourceCardId,
          sourceInstanceId: grant.sourceInstanceId,
          sourcePermanentId: grant.permanentId,
        });
        if (response.kind !== "optional" || !response.accept) return 0;
      }
      if (grant.oncePerTurnKey !== undefined) {
        engine.tracker.register(`link-cost/${grant.oncePerTurnKey}`, "replacement");
      }
      return grant.amount;
    },
    canLeaveBattleArea: (permanentId) =>
      !engine.continuous.hasRestriction(permanentId, "leaveBattleAreaExceptByDeletion"),
    link: (targetPermanentId, instanceIds) => engine.primitives.link(targetPermanentId, instanceIds),
    ruleProcess: () => ruleProcess(engine),
  };
}

/** Main DNA requires printed DNA requirements; effect-driven DNA keeps its separate cost rules. */
export function dnaDigivolveDeps(engine: GameEngine): DnaDigivolveDeps {
  const mem = memoryDepsFromGauge(engine.memory);
  return {
    maxAffordable: mem.maxAffordable,
    matchingCost: (definition, materials) => matchingDnaDigivolveCost(definition, materials),
    effectiveMaterialDefinitions: (_state, materials, definition) =>
      materials.map((material) => {
        const printed = lookupDefinition(material.topCard!.cardId)!;
        const effectiveLevel = engine.continuous.dnaLevelFor(material.permanentId, definition);
        const names = effectiveNames(engine.continuous, material, printed.nameEn ?? printed.cardId);
        return {
          ...printed,
          ...(effectiveLevel === undefined ? {} : { level: effectiveLevel }),
          nameEn: names.join(" | "),
        };
      }),
    adjustedCost: (_state, materials, definition, printedCost) => {
      let cost = printedCost;
      const target = materials[0];
      if (target !== undefined) {
        const adjustment = engine.modifiers.evoCostFor(target, definition);
        if (adjustment !== undefined) {
          cost = "fixed" in adjustment ? adjustment.fixed : cost + adjustment.delta;
        }
      }
      return Math.max(0, cost - engine.subTriggers.dnaCostReductionFor(materials, definition));
    },
    potentialInteractiveDnaDigivolveReduction: (_state, seat, materials, definition) => {
      const target = materials[0];
      if (target === undefined || engine.continuous.blocksCostReduction(seat, "digivolve")) return 0;
      return engine.subTriggers.potentialInteractiveReductionFor("wouldDigivolve", seat, target, definition, {
        hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
        markFired: (key) => engine.tracker.register(key, "replacement"),
      });
    },
    activateInteractiveDnaDigivolveReduction: async (_state, seat, materials, definition, evolvingInstanceId) => {
      const target = materials[0];
      if (target === undefined || engine.continuous.blocksCostReduction(seat, "digivolve")) return 0;
      return engine.subTriggers.activateInteractiveReductionsFor(
        "wouldDigivolve",
        seat,
        target,
        definition,
        evolvingInstanceId,
        (sourcePermanentId, sourceInstanceId) => {
          const source = engine.access.permanentById(sourcePermanentId);
          return source?.topCard === undefined
            ? undefined
            : buildEffectContext(
                engine,
                cardSourceOf(engine, findInstance(engine, sourceInstanceId ?? "")?.instance ?? source.topCard),
                {},
              );
        },
        {
          hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
          markFired: (key) => engine.tracker.register(key, "replacement"),
        },
        materials,
      );
    },
    materialsRestricted: (_state, materials, definition) =>
      materials.some(
        (material) =>
          engine.continuous.hasRestriction(material.permanentId, "digivolve") ||
          (definition.level === 7 && engine.continuous.hasRestriction(material.permanentId, "digivolveToLevel7")) ||
          (!material.isSuspended && engine.continuous.isUnsuspendedDigivolveProhibited(material.controllerSeat)),
      ),
    dnaDigivolveInto: (materialPermanentIds, resultInstanceId, opts) =>
      engine.primitives.dnaDigivolveInto(materialPermanentIds, resultInstanceId, opts),
  };
}

/**
 * Adapt the engine's capabilities to the turn-phase state machine's narrow port
 * (subsystem: turn-phase-state-machine). The machine itself is fully implemented;
 * the dependencies it calls are filled in as their subsystems land.
 */
export function buildTurnFlowHooks(engine: GameEngine): TurnFlowHooks {
  return {
    fireTiming: async (timing) => engine.fireTiming(timing),
    draw: async (seat, count) => (await drawCards(engine, seat, count)).length,
    deckCount: (seat) => engine.state.players[seat]?.deck.length ?? 0,
    unsuspendForActivePhase: async (seat) => engine.unsuspendForActivePhase(seat),
    runBreedingPhase: async (seat) => runBreedingPhase(engine, seat),
    runMainPhase: async (seat) => {
      engine.mainEntryPending = true;
      try {
        return await engine.mainPhase.run(seat);
      } finally {
        engine.mainEntryPending = false;
      }
    },
    finalizeMainPhaseEntry: () => {
      engine.mainEntryPending = false;
      const passed = engine.deferredEndPhaseSeat;
      engine.deferredEndPhaseSeat = undefined;
      if (passed !== undefined) applyIntent(engine, passed, { type: "endPhase" });
      // The input controller deliberately opens before asynchronous start-of-main
      // work finishes. A very fast client can therefore submit a legal verb while
      // engine finalizer is still pending. Route through the guarded post-verb check:
      // if that verb has an active effect window, it owns the eventual turn-end
      // check (including Blitz) and engine stale entry finalizer must do nothing.
      checkTurnEndAfterVerb(engine);
    },
    isGameOver: () => engine.state.gameOver,
    declareDeckOutLoss: (loserSeat) => {
      // Deck-out: the seat that must draw from an empty deck loses; the opponent
      // wins (security-and-win-check). WinCheck.declareLoss is idempotent.
      engine.win.declareLoss(loserSeat, "deckOut");
    },
    clearDurations: async (boundary) => {
      // Per-turn use limits (maxPerTurn / Once Per Turn) reset at the start of each
      // turn — the engine owns the UseTracker lifecycle (source
      // The per-turn usage ledger is cleared at each turn boundary. This is the
      // intent-protocol-and-room concern of keeping the per-turn ledger correct so
      // activated/triggered effects re-arm.
      if (boundary === "ownerTurnStart") {
        rollTurnActivity(engine.state);
        engine.tracker.resetForNewTurn();
        engine.combat.attackedThisTurn.clear();
        engine.resolvedBlitzOpportunities.clear();
        engine.acceptedBlitzAttackers.clear();
        engine.crossedMemoryRushAttackers.clear();
        engine.blitzDecisionInFlight = false;
      }
      await sweepDurations(engine, boundary);
    },
  };
}
