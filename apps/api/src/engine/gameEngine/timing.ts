import { isTimingActivationDisabled } from "../effects/timingActivation.js";
import {
  CardKind,
  EffectTiming,
  PlayerState,
  Permanent,
  type CardColor,
  type CardInstance,
  type Seat,
  type ZoneRef,
} from "@aegis/shared";
import { setTopCard } from "../state/access.js";
import { type CombatTrigger } from "../combat/controller.js";
import { lookupDefinition, definitionOf, cardHasTrait } from "../cards/cardData.js";
import { canActivate, canTrigger } from "../effects/kernel.js";
import { runTiming } from "../effects/index.js";
import { effectsOf } from "../effects/collect.js";
import {
  applyWouldBePlayedSelfReducer,
  potentialWouldBePlayedSelfReduction,
  wouldBePlayedSelfReducersFor,
} from "../effects/interpreter.js";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";
import type { CollectedEffect } from "../effects/collect.js";
import type { EffectContext, TriggerInfo } from "../effects/EffectContext.js";
import { digivolvedFromTamerBase } from "./subTriggerIdentity.js";
import { resolutionDeps } from "./actionDeps.js";
import { findInstance, findLooseInstance } from "./intents.js";
import type { GameEngine } from "../GameEngine.js";
import { pendingWindowCollected, withPendingSubTriggers } from "./subTriggers.js";

/**
 * Fire an effect-timing window through the stack (subsystem: effect-stack-resolution).
 * Delegates to the resolver composition root (`runTiming`): collect every effect
 * that triggers at `timing` across the candidate zones, order turn-player-first,
 * prompt for optionals/ordering, and resolve one at a time — folding in effects
 * triggered DURING resolution (documented behavior). Centralized
 * so every caller (turn machine, actions, security check) shares one seam.
 */
/**
 * Map a {@link CombatTrigger} onto the {@link TriggerInfo} a timing window reads. Shared by
 * the plain combat timing hook and the combined [When Attacking]/＜Alliance＞ window so both
 * present the same trigger data to collected effects.
 */
export function combatTriggerInfo(engine: GameEngine, trigger: CombatTrigger): TriggerInfo {
  return {
    attackerPermanentId: trigger.attackerPermanentId,
    attackMechanic: trigger.attackMechanic,
    defenderPermanentId: trigger.defenderPermanentId,
    defenderAtDeclaration: trigger.defenderAtDeclaration,
    blockerPermanentId: trigger.blockerPermanentId,
    ...(trigger.target?.kind === "permanent" ? { targetPermanentId: trigger.target.permanentId } : {}),
    deletedPermanentId: trigger.deletedPermanentId,
    deletedPermanentIds: trigger.deletedPermanentIds,
    deletedPermanentSnapshots: trigger.deletedPermanentSnapshots,
    deletingPermanentId: trigger.deletingPermanentId,
    removalCause: trigger.removalCause,
    deletedControllerSeat: trigger.deletedControllerSeat,
    deletedTopCardId: trigger.deletedTopCardId,
    deletedEffectiveColorsByInstanceId: trigger.deletedEffectiveColorsByInstanceId,
    deletedInstanceIds: trigger.deletedInstanceIds,
    deletedWasStackInstanceIds: trigger.deletedWasStackInstanceIds,
    deletedWasLinkedInstanceIds: trigger.deletedWasLinkedInstanceIds,
    deletedLinkHostInstanceByLinkedInstanceId: trigger.deletedLinkHostInstanceByLinkedInstanceId,
    fortitudeInstanceIds: trigger.fortitudeInstanceIds,
    deletedHostInstanceByInstanceId: trigger.deletedHostInstanceByInstanceId,
    customEffectGrantsSnapshot: trigger.customEffectGrantsSnapshot,
    battleOpponentPermanentIdByInstanceId: trigger.battleOpponentPermanentIdByInstanceId,
  };
}

export async function fireTiming(
  engine: GameEngine,
  timing: EffectTiming,
  trigger: TriggerInfo = {},
  transientCandidates: readonly CardInstance[] = [],
): Promise<void> {
  if (timing === EffectTiming.OnDestroyedAnyone) {
    // Every deletion of ONE rule-check pass is simultaneous (§17-1-3), so its [On Deletion]
    // effects join the pass's single pool instead of opening a window per sweep (§15-4-3-3).
    if (engine.ruleTriggerPool !== undefined) {
      engine.ruleTriggerPool.push({
        trigger: { ...trigger },
        ascensionCandidates: [],
        // A deleted Token leaves the match instead of entering trash. Capture its live card
        // instance before movement so its already-triggered [On Deletion] can still join the
        // pooled post-fixpoint window (EX11-012 Q6514).
        transientCandidates: [
          ...transientCandidates,
          ...engine
            .instancesById(trigger.deletedInstanceIds ?? [])
            .filter((instance) => definitionOf(instance).isToken === true),
        ],
      });
      return;
    }
    // A deletion caused during another effect only TRIGGERS [On Deletion] at that point.
    // Activation waits until the causing effect has finished (§15-4-4). Re-collecting at
    // flush time also enforces §15-4-4-3: if that card left trash meanwhile, its pending
    // effect can no longer activate (BT26-016 Q6977).
    if (engine.activeWindowToken !== undefined && !engine.flushingDeferredTimingWindows) {
      engine.deferredTimingWindows.push({
        timing,
        trigger: { ...trigger },
        transientCandidates: [
          ...transientCandidates,
          ...engine
            .instancesById(trigger.deletedInstanceIds ?? [])
            .filter((instance) => definitionOf(instance).isToken === true),
        ],
      });
      return;
    }
  }
  if (engine.shouldDeferNestedTiming() && !engine.flushingDeferredTimingWindows) {
    await engine.recomputeContinuousEffects();
    engine.deferNestedTimingEffects(timing, trigger, [...engine.listCandidateInstances(), ...transientCandidates]);
    return;
  }
  await runTimingWindow(engine, timing, trigger, transientCandidates);
}

/**
 * Resolve one timing window, past the deferral gates {@link fireTiming} applies. The
 * pooled rule-check window calls engine directly: at that point the fixpoint has converged
 * and no card body is on the stack, so there is nothing left to defer behind.
 */
/**
 * Resolve the nested pending pool for an effect-directed attack whose ordering body is a
 * watcher rather than a timing window, so nothing else would drain it before Counter Timing
 * and the security check (§11-1). The pool is the ONLY source here — candidate instances are
 * narrowed to none — so engine drains what the attack and its ordering body already triggered
 * rather than re-opening a [When Attacking] window of its own.
 */
export async function drainPendingAttackTriggers(engine: GameEngine): Promise<void> {
  if (pendingWindowCollected(engine).length === 0) return;
  const wasOutermostWindow = engine.beginResolvingWindow();
  try {
    await engine.withTriggeredMutations(() =>
      engine.withPendingPoolDrain(wasOutermostWindow, () =>
        runTiming(
          EffectTiming.OnUseAttack,
          engine.effectEnvironment({}),
          resolutionDeps(engine, () => [], { outermost: true }),
        ),
      ),
    );
    await engine.recomputeContinuousEffects();
  } finally {
    engine.endResolvingWindow(wasOutermostWindow);
  }
}

export async function runTimingWindow(
  engine: GameEngine,
  timing: EffectTiming,
  trigger: TriggerInfo,
  transientCandidates: readonly CardInstance[] = [],
): Promise<void> {
  // A play-cost deletion belongs to the play's own trigger batch (KB Q5131): collect its
  // [On Deletion] effects at trigger time and hand them to the play's entry window, where
  // they compete with the played card's [On Play] in one ordering prompt. Gated here rather
  // than in `fireTiming` because a rule-check pass routes its pooled deletion window
  // straight to engine runner.
  if (timing === EffectTiming.OnDestroyedAnyone && engine.payingPlayCost) {
    await engine.recomputeContinuousEffects();
    engine.pendingPlayCostDeletionEffects.push(
      ...engine.collectNestedTimingEffects(timing, trigger, [
        ...engine.listCandidateInstances(),
        ...transientCandidates,
      ]),
    );
    return;
  }
  const wasOutermostWindow = engine.beginResolvingWindow();
  const excludedNestedPending =
    engine.effectResolutionDepth === 0 ? new Set(engine.pendingNestedTimingEffects) : undefined;
  try {
    await engine.recomputeContinuousEffects();
    // A phase-boundary event has one fixed set of card sources: a Tamer played by an
    // earlier start-of-turn/start-of-main effect did not exist when that boundary
    // occurred and cannot retroactively trigger (BT24-082/Q5664, BT24-083/Q5667).
    // The end of the turn is the same kind of boundary in the other direction: a card
    // that ARRIVES while it is being resolved has missed it, so its own end-of-turn
    // clause is not processed engine turn (Q2731/Q2762 — "the end of the turn timing has
    // already passed"). Without the snapshot, EX11-046's "[End of Opponent's Turn] engine
    // Digimon may digivolve into [Galacticmon]" put a fresh Galacticmon on top of the
    // stack that fired the very same clause again, chaining through hand and trash in
    // one window.
    // Keep every other timing window live because derived triggers and mid-window
    // digivolutions intentionally join those resolution fixpoints.
    const phaseBoundarySourceLocations =
      timing === EffectTiming.OnStartTurn ||
      timing === EffectTiming.OnStartMainPhase ||
      timing === EffectTiming.OnEndTurn
        ? new Map(
            engine
              .listCandidateInstances()
              .map((instance) => [instance.instanceId, engine.candidateSourceLocation(instance.instanceId)]),
          )
        : undefined;
    const listWindowCandidates =
      phaseBoundarySourceLocations === undefined && transientCandidates.length === 0
        ? undefined
        : (): CardInstance[] => {
            const live =
              phaseBoundarySourceLocations === undefined
                ? engine.listCandidateInstances()
                : engine
                    .instancesById([...phaseBoundarySourceLocations.keys()])
                    .filter(
                      (instance) =>
                        engine.candidateSourceLocation(instance.instanceId) ===
                        phaseBoundarySourceLocations.get(instance.instanceId),
                    );
            const candidates = new Map(live.map((instance) => [instance.instanceId, instance] as const));
            for (const instance of transientCandidates) candidates.set(instance.instanceId, instance);
            return [...candidates.values()];
          };
    // GRANTED timed triggers fired at the same physical point as the matching window, and
    // therefore simultaneous with the printed effects it collects:
    //   - "[Start of Your Main Phase]" granted onto a permanent (BT23-056); the per-install
    //     `matches` gate re-checks turn-ownership so it fires only on the watched permanent's
    //     owner's main phase (documented behavior), never the granter's.
    //   - "[End of Your Turn]" (EX10-035's delayed self-delete) and "at the end of your
    //     opponent's turn" (EX3-069/EX4-058/EX4-071/EX6-070/BT16-084/BT16-085/BT16-088/
    //     BT17-025), both at the OnEndTurn window while `state.turnSeat` is still the ENDING
    //     player's seat, which is what `endOfOpponentTurnGate` reads.
    // Everything engine window resolves is a TRIGGERED effect, so its mutations must not be
    // tagged continuous even when a recompute is still in flight around it (see
    // {@link withTriggeredMutations}).
    const runWindow = async (): Promise<void> =>
      engine.withTriggeredMutations(async () => {
        await engine.withPendingPoolDrain(wasOutermostWindow, () =>
          runTiming(
            timing,
            engine.effectEnvironment(trigger),
            resolutionDeps(engine, listWindowCandidates, {
              outermost: wasOutermostWindow,
              excludeNestedPending: excludedNestedPending,
            }),
          ),
        );
        if (wasOutermostWindow) {
          await engine.flushDeferredTimingWindows();
          await engine.flushDeferredSecurityRemovalTriggers();
        }
      });
    if (timing === EffectTiming.OnStartMainPhase) {
      await withPendingSubTriggers(engine, ["startOfYourMainPhase"], {}, runWindow);
    } else if (timing === EffectTiming.OnEndTurn) {
      await withPendingSubTriggers(engine, ["endOfTurn", "endOfOpponentTurn"], {}, runWindow);
    } else {
      await runWindow();
    }
    if (timing === EffectTiming.OnEndTurn) {
      await engine.digivolveSupport.processPendingBurstDigivolveTrash();
    }
    await engine.recomputeContinuousEffects();
  } finally {
    engine.endResolvingWindow(wasOutermostWindow);
  }
}

/**
 * Resolve the two trigger families created by one deletion. Ascension is deliberately
 * represented in the ordinary orderTriggers channel: if it resolves first, the card leaves
 * trash and the subsequent On Deletion collection correctly drops that pending effect (Q7100).
 *
 * `fire` opens the [On Deletion] window; the pooled rule-check flush substitutes the
 * non-deferring runner so the whole pass resolves as one window.
 */
export async function resolveDeletionReactions(
  engine: GameEngine,
  trigger: TriggerInfo,
  ascensionCandidates: readonly { instanceId: string; seat: Seat }[],
  fire: (deletionTrigger: TriggerInfo) => Promise<void> = (deletionTrigger) =>
    engine.fireTiming(EffectTiming.OnDestroyedAnyone, deletionTrigger),
  transientCandidates: readonly CardInstance[] = [],
  deferNested = true,
): Promise<void> {
  // A rule-check pass pools every deletion it performs, Ascension offer included, and
  // resolves them as one simultaneous group once the fixpoint converges (§17-1-3,
  // §15-4-3-3). Without engine each sweep would resolve its own [On Deletion] effects
  // before the next sweep even ran.
  if (engine.ruleTriggerPool !== undefined) {
    engine.ruleTriggerPool.push({
      trigger: { ...trigger },
      ascensionCandidates: [...ascensionCandidates],
      transientCandidates: [...transientCandidates],
    });
    return;
  }
  // A deletion inside an effect creates one reaction group. Park Ascension together
  // with On Deletion until that body ends; otherwise Ascension can remove the card
  // from trash before the controller's chosen On Deletion-first order runs.
  if (deferNested && engine.shouldDeferNestedTiming() && !engine.flushingDeferredTimingWindows) {
    engine.deferredTimingWindows.push({
      timing: EffectTiming.OnDestroyedAnyone,
      trigger: { ...trigger },
      transientCandidates: [...transientCandidates],
      ascensionCandidates: [...ascensionCandidates],
    });
    return;
  }
  const ascend = async ({ instanceId, seat }: { instanceId: string; seat: Seat }): Promise<void> => {
    if (findLooseInstance(engine, instanceId) === undefined) return;
    const response = await engine.decisions.request({
      seat,
      kind: "selectCards",
      promptText: "＜Ascension＞: place engine card at the top of your security stack?",
      options: { candidateInstanceIds: [instanceId], min: 0, max: 1 },
    });
    if (response.kind === "selectCards" && response.instanceIds.includes(instanceId)) {
      await engine.primitives.ascendToSecurity(instanceId);
    }
  };

  // Every simultaneously-deleted Ascension candidate that ALSO prints its own [On Deletion]
  // needs its own ascend-vs-on-deletion ordering choice (§15-4-3-4/-3-5) — not just the
  // first one found. A second such candidate in the same batch previously fell through to
  // the plain `ascend()` loop below with no ordering choice at all, always resolving its
  // own [On Deletion] (inside the single shared `fire`) before it could ever be asked to
  // ascend first.
  const selfEffectCandidates = ascensionCandidates.filter(({ instanceId }) => {
    const card = findLooseInstance(engine, instanceId);
    return card !== undefined && definitionOf(card).effectText?.includes("[On Deletion]") === true;
  });
  if (selfEffectCandidates.length === 0) {
    await fire(trigger);
    for (const pending of ascensionCandidates) await ascend(pending);
    return;
  }

  const ascendBeforeFire: { instanceId: string; seat: Seat }[] = [];
  const ascendAfterFire: { instanceId: string; seat: Seat }[] = [];
  for (const candidate of selfEffectCandidates) {
    const ascensionKey = `ascension/${candidate.instanceId}`;
    const onDeletionKey = `on-deletion/${candidate.instanceId}`;
    const response = await engine.decisions.request({
      seat: candidate.seat,
      kind: "orderTriggers",
      promptText: "Choose whether to activate ＜Ascension＞ or [On Deletion] first.",
      options: { triggerKeys: [ascensionKey, onDeletionKey] },
    });
    const ascensionFirst = response.kind === "orderTriggers" && response.order[0] === ascensionKey;
    (ascensionFirst ? ascendBeforeFire : ascendAfterFire).push(candidate);
  }
  for (const candidate of ascendBeforeFire) await ascend(candidate);
  await fire(trigger);
  for (const candidate of ascendAfterFire) await ascend(candidate);
  for (const pending of ascensionCandidates) {
    if (!selfEffectCandidates.some(({ instanceId }) => instanceId === pending.instanceId)) await ascend(pending);
  }
}

/**
 * Fire a timing window scoped to one source instance (subsystem:
 * effect-stack-resolution). The play-card verb fires On Play for a newly placed
 * permanent and the option activation for an Option card; only the played card's
 * effects should fire at that window (the rest of the board is not triggering on
 * its own play here), so the candidate set is narrowed to that single instance.
 *
 * `trigger` is carried into the window's `ctx.trigger` (e.g. `enteredByEffect` for an
 * effect-driven play/digivolve — see {@link fireEnteredByEffectTiming}). Each window's
 * environment carries its OWN trigger payload (no shared engine field), so firing NESTED
 * inside an outer effect's resolution — or interleaved with a concurrent one — can never
 * strip or clobber another window's trigger.
 */
export async function fireTimingForInstance(
  engine: GameEngine,
  timing: EffectTiming,
  sourceInstanceId: string,
  trigger: TriggerInfo = {},
  extraPending: readonly CollectedEffect[] = [],
): Promise<void> {
  if (engine.shouldDeferNestedTiming()) {
    await engine.recomputeContinuousEffects();
    engine.deferNestedTimingEffects(timing, trigger, engine.instancesById([sourceInstanceId]));
    return;
  }
  const wasOutermostWindow = engine.beginResolvingWindow();
  const excludedNestedPending =
    engine.effectResolutionDepth === 0 ? new Set(engine.pendingNestedTimingEffects) : undefined;
  try {
    await engine.recomputeContinuousEffects();
    await engine.withPendingPoolDrain(wasOutermostWindow, () =>
      runTiming(
        timing,
        engine.effectEnvironment(trigger),
        resolutionDeps(engine, () => engine.instancesById([sourceInstanceId]), {
          outermost: wasOutermostWindow,
          extraPending,
          excludeNestedPending: excludedNestedPending,
        }),
      ),
    );
    if (wasOutermostWindow) {
      await engine.flushDeferredTimingWindows();
      await engine.flushDeferredSecurityRemovalTriggers();
    }
    await engine.recomputeContinuousEffects();
  } finally {
    engine.endResolvingWindow(wasOutermostWindow);
  }
}

/**
 * Fire `timing` scoped to a single permanent (its top card plus its digivolution-stack
 * and linked cards). The [When Digivolving] / [When Attacking] windows are the
 * permanent's OWN timing — they must NOT collect the same timing from OTHER permanents
 * on the board. Cross-permanent reactions ("when one of your Digimon digivolves")
 * go through `fireSubTrigger` watchers, not engine window.
 */
export async function fireTimingForPermanent(
  engine: GameEngine,
  timing: EffectTiming,
  permanent: Permanent,
  trigger: TriggerInfo = {},
  extraPending: readonly CollectedEffect[] = [],
): Promise<void> {
  if (engine.shouldDeferNestedTiming()) {
    await engine.recomputeContinuousEffects();
    const scoped: CardInstance[] = [];
    engine.collectPermanentInstances(permanent, scoped);
    engine.deferNestedTimingEffects(timing, trigger, scoped);
    return;
  }
  const wasOutermostWindow = engine.beginResolvingWindow();
  // Freeze the subject instance set at window open. The resolver re-collects every pass
  // (to fold in effects that BECOME active during resolution), but a card that digivolves
  // onto engine permanent MID-WINDOW would otherwise be re-collected here and have its
  // WhenDigivolving fired a SECOND time — it already fired through the effect-driven entry
  // seam (`fireEnteredByEffect` -> `fireTimingForInstance`). Restricting the live re-collect
  // to instances present at open keeps genuine re-triggers on those same instances while
  // excluding a newly-arrived top card (a distinct instanceId).
  const subjectInstanceIds = new Set<string>();
  {
    const opening: CardInstance[] = [];
    engine.collectPermanentInstances(permanent, opening);
    for (const instance of opening) subjectInstanceIds.add(instance.instanceId);
  }
  try {
    await engine.recomputeContinuousEffects();
    await engine.withPendingPoolDrain(wasOutermostWindow, () =>
      runTiming(
        timing,
        engine.effectEnvironment(trigger),
        resolutionDeps(
          engine,
          () => {
            const scoped: CardInstance[] = [];
            engine.collectPermanentInstances(permanent, scoped);
            return scoped.filter((instance) => subjectInstanceIds.has(instance.instanceId));
          },
          { outermost: wasOutermostWindow, extraPending },
        ),
      ),
    );
    if (wasOutermostWindow) {
      await engine.flushDeferredTimingWindows();
      await engine.flushDeferredSecurityRemovalTriggers();
    }
    await engine.recomputeContinuousEffects();
  } finally {
    engine.endResolvingWindow(wasOutermostWindow);
  }
}

/**
 * The entry windows one PLAY opens, as a single pool: the played card's own [On Play], the
 * board-wide enter-field window, and every armed `whenPlayed` watcher ("when you play a green
 * Tamer, draw 1"). Shared by every play seam (playCard, DigiXros, Assembly) so they sequence
 * identically. Only `OnPlay` carries the board-wide half; any other timing just fires scoped.
 *
 * The pool is snapshotted from the board as it is when the card ENTERS, which is when those
 * triggers are determined. The trailing bus resolves only that snapshot: a watcher gained
 * during engine play's windows did not exist when the event happened (BT13-013, Q2272).
 */
export async function firePlayEntryWindows(
  engine: GameEngine,
  timing: EffectTiming,
  sourceInstanceId: string,
  scopedTrigger: TriggerInfo = {},
  opts: { deferWhenPlayed?: boolean } = {},
): Promise<void> {
  // Whatever a play-cost deletion triggered rides into engine play's own window (Q5131).
  const costDeletionEffects = engine.pendingPlayCostDeletionEffects.splice(0);
  if (timing !== EffectTiming.OnPlay) {
    await engine.fireTimingForInstance(timing, sourceInstanceId, scopedTrigger, costDeletionEffects);
    return;
  }
  const entryPermanentId = findInstance(engine, sourceInstanceId)?.permanent?.permanentId;
  const playedEventTrigger = {
    ...playedTrigger(engine, entryPermanentId),
    ...scopedTrigger,
    entryCause: "play" as const,
  };
  if (entryPermanentId !== undefined) {
    materializePlayerCustomEffects(engine, engine.access.permanentById(entryPermanentId));
  }
  // The played card is already in the battle area when its play event happens, so its
  // resident `whenPlayed` watchers are eligible to trigger on that same event (BT25-028;
  // BT22-039 Q4893). Install those entry-state subscriptions before taking the event
  // snapshot. Effects gained later while [On Play] resolves remain excluded by
  // `onlyInitiallyArmed`, preserving the trigger-time snapshot rule (BT13-013 Q2272).
  await engine.recomputeContinuousEffects();
  const events = opts.deferWhenPlayed
    ? (["onEnterFieldAnyone"] as const)
    : (["whenPlayed", "onEnterFieldAnyone"] as const);
  await withPendingSubTriggers(
    engine,
    events,
    playedEventTrigger,
    async () => {
      // State-based rules run after the card enters and continuous effects apply, before
      // its triggered On Play effect can activate. Keep the play-event snapshot above so
      // other when-played watchers still observe the event even if a 0-DP entrant is deleted
      // here and its own On Play source becomes ineligible (EX4-074 Q3523).
      //
      // A play performed BY an effect still resolving is the exception (BT24-041 Q5629): no
      // state-based action may run between that effect's clauses, so the 0-DP entrant stays
      // on the field until the whole effect finishes and the outer sweep deletes it. This
      // mirrors the guarded `ruleProcess` seam the interpreter itself is given.
      if (engine.effectResolutionDepth === 0 && engine.optionResolutionDepth === 0) await engine.ruleProcess();
      await engine.fireTimingForInstance(timing, sourceInstanceId, scopedTrigger, costDeletionEffects);
      await engine.fireTiming(EffectTiming.OnEnterFieldAnyone, {
        ...scopedTrigger,
        ...(entryPermanentId !== undefined ? { subjectPermanentId: entryPermanentId } : {}),
        entryCause: "play",
      });
    },
    {
      onlyInitiallyArmed: true,
      busTrigger: () => playedEventTrigger,
      // A play performed by a still-resolving effect parks the entering card's own [On Play]
      // for the enclosing window. Its `whenPlayed` watchers triggered on that same entry and
      // are simultaneous with it (CR §15-4), so they follow it there instead of resolving
      // first on the trailing bus (BT20-028 Q4321).
      parkArmedToEnclosingWindow: () => engine.shouldDeferNestedTiming(),
    },
  );
}

/** Materialize filtered player-scoped named grants before a new permanent's On Play window. */
export function materializePlayerCustomEffects(engine: GameEngine, permanent: Permanent | undefined): void {
  const top = permanent?.topCard;
  if (permanent === undefined || top === undefined) return;
  for (const grant of engine.continuous.playerCustomEffectsFor(permanent.permanentId, permanent.controllerSeat)) {
    engine.continuous.addCustomEffectGrant(top.instanceId, top.ownerSeat, grant.token, grant.duration, {
      activationIdentity: grant.activationIdentity,
    });
  }
}

/** The `whenPlayed` payload for a played permanent: its subject id plus its printed level/cost. */
export function playedTrigger(engine: GameEngine, playedPermanentId: string | undefined): TriggerInfo | undefined {
  if (playedPermanentId === undefined) return undefined;
  const played = engine.access.permanentById(playedPermanentId);
  const definition = played?.topCard === undefined ? undefined : definitionOf(played.topCard.cardId);
  return {
    subjectPermanentId: playedPermanentId,
    ...(definition?.level !== undefined ? { playedLevel: definition.level } : {}),
    ...(definition?.playCost !== undefined ? { playedPlayCost: definition.playCost } : {}),
  };
}

/**
 * Producer for the `triggerEnteredByEffect` gate (BT25-084): an EFFECT just played or
 * digivolved `instanceId` into the battle area, so fire that card's OWN [On Play] /
 * [When Digivolving] window with `enteredByEffect` set to its controller's seat. This
 * is also the seam that makes an effect-played Digimon's [On Play] fire AT ALL — the
 * effect-driven play/digivolve verbs (`playInstances` / `digivolveFromInstance` /
 * `dnaDigivolveInto`) previously placed the permanent without firing its entry window.
 * A MANUAL hard play/digivolve takes the play/digivolve action's own seam (no
 * `enteredByEffect`), so the by-effect gate stays false there.
 */
export async function fireEnteredByEffectTiming(
  engine: GameEngine,
  timing: EffectTiming,
  instanceId: string,
  ownerSeat: Seat,
  opts?: {
    isDnaDigivolve?: boolean;
    digivolvedFromZone?: ZoneRef;
    baseWasDigimon?: boolean;
    playedFromZone?: ZoneRef;
    digiXrosMaterialCount?: number;
    playedByEffectSourceCardId?: string;
    playedByDecode?: boolean;
    deferWhenPlayed?: boolean;
  },
): Promise<void> {
  const attackerPermanentId = engine.combat?.currentAttackerId;
  const subjectPermanent = findInstance(engine, instanceId)?.permanent;
  if (subjectPermanent !== undefined) subjectPermanent.enteredByEffect = true;
  if (timing === EffectTiming.OnPlay) materializePlayerCustomEffects(engine, subjectPermanent);
  // Effect-driven digivolutions are genuine digivolutions for "digivolved engine turn"
  // conditions (BT1-007 Q871). As with the manual action seam, breeding-area evolutions
  // remain excluded unless card text explicitly references that area (Q870).
  if (timing === EffectTiming.WhenDigivolving && subjectPermanent !== undefined && !subjectPermanent.inBreeding) {
    engine.tracker.register(`seat:${ownerSeat}`, "digivolvedThisTurn");
  }
  if (timing === EffectTiming.OnPlay) {
    await firePlayEntryWindows(
      engine,
      timing,
      instanceId,
      {
        enteredByEffect: ownerSeat,
        ...(attackerPermanentId !== undefined ? { attackerPermanentId } : {}),
        ...(opts?.playedFromZone !== undefined ? { playedFromZone: opts.playedFromZone } : {}),
        ...(opts?.digiXrosMaterialCount !== undefined ? { digiXrosMaterialCount: opts.digiXrosMaterialCount } : {}),
        ...(opts?.playedByEffectSourceCardId !== undefined
          ? { playedByEffectSourceCardId: opts.playedByEffectSourceCardId }
          : {}),
        ...(opts?.playedByDecode === true ? { playedByDecode: true } : {}),
      },
      opts,
    );
    return;
  }
  await engine.fireTimingForInstance(timing, instanceId, {
    enteredByEffect: ownerSeat,
    ...(attackerPermanentId !== undefined ? { attackerPermanentId } : {}),
    ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
    ...(opts?.digivolvedFromZone !== undefined ? { digivolvedFromZone: opts.digivolvedFromZone } : {}),
    ...(opts?.playedFromZone !== undefined ? { playedFromZone: opts.playedFromZone } : {}),
    ...(opts?.digiXrosMaterialCount !== undefined ? { digiXrosMaterialCount: opts.digiXrosMaterialCount } : {}),
    ...(opts?.playedByEffectSourceCardId !== undefined
      ? { playedByEffectSourceCardId: opts.playedByEffectSourceCardId }
      : {}),
  });
  const subjectPermanentId = subjectPermanent?.permanentId;
  if (subjectPermanentId === undefined) return;
  if (timing === EffectTiming.WhenDigivolving) {
    await engine.fireTiming(EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId,
      entryCause: "digivolve",
      enteredByEffect: ownerSeat,
      ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
    });
    await engine.fireSubTrigger("onEnterFieldAnyone", {
      subjectPermanentId,
      entryCause: "digivolve",
      enteredByEffect: ownerSeat,
      ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
    });
    // Q6671/Q6708: a Tamer base digivolves as a Tamer, so the payload is tagged and the
    // SubTrigger gate withholds plain "when a Digimon digivolves" watchers while Tamer-naming
    // watchers still fire. The caller's report reads EFFECTIVE kinds, so a Tamer treated as a
    // Digimon is not tagged; callers that report nothing (App Fusion) fall back to the printed
    // base. The entering card's own [When Digivolving] window above, and the bonus draw
    // (Q6709), are unaffected.
    const tamerDigivolved = digivolvedFromTamerBase(subjectPermanent) && opts?.baseWasDigimon !== true;
    const watcherTrigger = {
      subjectPermanentId,
      enteredByEffect: ownerSeat,
      ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
      ...(opts?.digivolvedFromZone !== undefined ? { digivolvedFromZone: opts.digivolvedFromZone } : {}),
      ...(tamerDigivolved ? { tamerDigivolved: true } : {}),
    };
    await engine.fireSubTrigger("whenOneOfYoursDigivolves", watcherTrigger);
    await engine.fireSubTrigger("whenAnyDigivolves", watcherTrigger);
  }
}

/**
 * Re-activate one (or, with `chooseOne: false`, ALL) of a TARGET permanent's own effects at
 * the given timing(s) — generalized from EX3-065's original "activate 1 of that Digimon's
 * [On Play] effects" (`timings` defaults to `[OnPlay]`, matching EX3-065 exactly) to also
 * cover BT11-112 ("[When Digivolving] effects"), BT24-102 ("[On Play] or [When Digivolving]
 * effect" — a combined pool across both timings), BT22-092 ("[Main] effects", i.e.
 * `EffectTiming.OnDeclaration`), and BT15-041 ("activate the [When Digivolving] effects" —
 * plural: `chooseOne: false` runs every matching effect instead of picking one).
 *
 * A genuine re-fire of another card's timing effect (not a proxy): each chosen effect
 * resolves with the TARGET permanent's top card as source, so its actions belong to that
 * Digimon and its controller. Collects the target's non-security effects across every listed
 * timing; with 2+ candidates and `chooseOne`, asks the target's controller to pick exactly
 * one (KB Q3430/Q3431 for the OnPlay case).
 *
 * Returns whether an effect actually resolved (false when there were no eligible candidates,
 * or the chosen one's `canActivate` failed) — BT22-092's "if engine activated any effect, gain
 * 1 memory" reads engine result rather than assuming success.
 */
export async function reactivateOnPlay(
  engine: GameEngine,
  permanentId: string,
  opts?: { timings?: EffectTiming[]; chooseOne?: boolean; outsideTriggerWindow?: boolean },
): Promise<boolean> {
  const permanent = engine.access.permanentById(permanentId);
  if (permanent?.topCard === undefined) return false;
  const timings = opts?.timings ?? [EffectTiming.OnPlay];
  const chooseOne = opts?.chooseOne ?? true;
  // Both gates, matching every other manual-resolution path (e.g. syncActivatableEffects,
  // fireBeforePayCost): canTrigger encodes the effect's declared `when` condition, which
  // canActivate alone does not — an effect whose trigger condition no longer holds must not
  // be offered/resolved even if its (often unconditional) canActivate would pass.
  const candidates = [permanent.topCard, ...permanent.stack]
    .flatMap((instance) => {
      const source = engine.cardSourceOf(instance);
      const ctx: EffectContext = { ...engine.buildEffectContext(source, {}), selections: new Map() };
      return timings.flatMap((timing) => {
        const timingKey: "whenDigivolving" | "onPlay" | "whenAttacking" | undefined =
          timing === EffectTiming.WhenDigivolving
            ? "whenDigivolving"
            : timing === EffectTiming.OnPlay
              ? "onPlay"
              : timing === EffectTiming.OnUseAttack
                ? "whenAttacking"
                : undefined;
        return effectsOf(timing, source).map((effect) => ({ effect, source, ctx, timing: timingKey }));
      });
    })
    .filter(({ effect }) => !effect.isSecurity)
    .filter(({ effect, ctx }) => opts?.outsideTriggerWindow === true || canTrigger(effect, ctx, engine.tracker));
  const availableCandidates = candidates.filter(({ ctx, timing }) => {
    if (timing === undefined) return true;
    const sourcePermanentId = ctx.source.permanent()?.permanentId;
    return sourcePermanentId === undefined || !isTimingActivationDisabled(engine.continuous, sourcePermanentId, timing);
  });
  if (availableCandidates.length === 0) return false;
  if (!chooseOne) {
    let activatedAny = false;
    for (const { effect, ctx, timing } of availableCandidates) {
      if (!canActivate(effect, ctx, engine.tracker)) continue;
      const sourcePermanentId = ctx.source.permanent()?.permanentId;
      if (
        timing !== undefined &&
        sourcePermanentId !== undefined &&
        isTimingActivationDisabled(engine.continuous, sourcePermanentId, timing)
      )
        continue;
      await effect.resolve(ctx);
      activatedAny = true;
    }
    await engine.recomputeContinuousEffects();
    return activatedAny;
  }
  let chosen = availableCandidates[0]!;
  if (availableCandidates.length > 1) {
    const index = await engine.decisionApi.chooseOption(
      chosen.ctx,
      availableCandidates.map(({ effect }) => effect.description),
    );
    chosen = availableCandidates[index] ?? availableCandidates[0]!;
  }
  if (!canActivate(chosen.effect, chosen.ctx, engine.tracker)) return false;
  const chosenSourcePermanentId = chosen.ctx.source.permanent()?.permanentId;
  if (
    chosen.timing !== undefined &&
    chosenSourcePermanentId !== undefined &&
    isTimingActivationDisabled(engine.continuous, chosenSourcePermanentId, chosen.timing)
  )
    return false;
  await chosen.effect.resolve(chosen.ctx);
  await engine.recomputeContinuousEffects();
  return true;
}

/**
 * Read-only hand-use-cost projection for card filters such as LM-023's Q5516 clause.
 * It mirrors only automatic card-local would-be-played reducers; paid/optional reducers remain
 * unknown until the actual payment window and must not be assumed or consumed by targeting.
 */
export function projectLooseUseCost(engine: GameEngine, instanceId: string, controllerSeat: Seat): number | undefined {
  const instance = findLooseInstance(engine, instanceId);
  if (instance === undefined) return undefined;
  const source = engine.cardSourceOf(instance);
  const baseCost = engine.modifiers.playCostFor(
    { def: source.definition, controllerSeat },
    Math.max(0, source.definition.playCost),
  );
  if (engine.continuous.blocksCostReduction(controllerSeat, "play")) return baseCost;
  const ctx: EffectContext = { ...engine.buildEffectContext(source, {}), selections: new Map() };
  const reduction = wouldBePlayedSelfReducersFor(instance.cardId).reduce(
    (total, reducer) => total + potentialWouldBePlayedSelfReduction(ctx, reducer),
    0,
  );
  return Math.max(0, baseCost - reduction);
}

/**
 * The pay-time interactive cost-reduction hook (subsystem: play-card / effect-framework). Fired
 * by the play action for the card being played WHILE IT IS STILL IN HAND, before memory is paid:
 * collect the played instance's `BeforePayCost` effects, resolve each through a single shared
 * EffectContext (so a `ReducePlayCost` action can run its OPTIONAL server-side payment — trash a
 * card / sacrifice a Digimon — and accumulate the earned delta on `ctx.playCostDelta`), then
 * return the FINAL cost floored at 0 (EX9-043 / BT25-076). The reduction is computed entirely
 * server-side — the client never supplies the delta (T-08-26 / T-08-27).
 *
 * This does NOT route through `runTiming`: that resolver narrates a triggered-effect stack and
 * cannot return a per-resolution value. The cost delta is a synchronous-within-await output of
 * the played card's own effects, so it is run directly against a focused context (mirroring the
 * `recomputeContinuousEffects` per-instance `resolve` loop), keeping the value observable.
 */
export async function fireBeforePayCost(
  engine: GameEngine,
  instance: CardInstance,
  baseCost: number,
  useAsOption = false,
  originZone?: ZoneRef,
  projectOnly = false,
): Promise<number> {
  const source = engine.cardSourceOf(instance);
  const reductionBlocked = engine.continuous.blocksCostReduction(source.ownerSeat, "play");
  // A prohibition prevents the reducer from activating, including its optional
  // processing cost (ST12-03 Q755). Projection stays read-only; an unaffordable
  // blocked play cannot start paying side-effect costs. Free plays enter engine
  // window with a zero base (Q4784).
  if (reductionBlocked && (projectOnly || engine.memory.maxCostFor(source.ownerSeat) < baseCost)) return baseCost;
  const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow !== "digivolve");
  // Self-targeted "when engine card would be played, [by cost / gated by condition], reduce by N"
  // reducers (EX8-074, BT17-068, BT12-112, BT8-043, BT9-097, ...): the runtime record compiled these as
  // inert `wouldBePlayed reduceCost` replacements (never consulted; `ReplacementSubscription.apply`
  // has no call site and self-reducers on a card still in hand never reach a Static continuous
  // recompute anyway). Run them here in the pay-time window alongside the BeforePayCost effects.
  const selfReducers = wouldBePlayedSelfReducersFor(instance.cardId);
  // Cross-permanent reducers: a permanent OTHER than the played card (BT10-093 / EX3-040)
  // that reduces the cost of a matching played card. Scanned so the early-return below does not
  // skip the pay-time window when only such a reducer applies.
  const crossWatchers = crossPermanentPlayReducerWatchers(engine, instance, source.ownerSeat);
  const residentEffects = residentPlayCostEffects(engine, source.ownerSeat);
  const breeding = engine.state.players[source.ownerSeat]?.breeding;
  const breedingResidentEffects = [breeding?.topCard, ...Array.from(breeding?.stack ?? [])].flatMap((card, index) => {
    if (card === undefined) return [];
    const residentSource = engine.cardSourceOf(card);
    return effectsOf(EffectTiming.BeforePayCost, residentSource)
      .filter((effect) => index === 0 || effect.isInherited)
      .map((effect) => ({ effect, source: residentSource }));
  });
  if (
    effects.length === 0 &&
    selfReducers.length === 0 &&
    crossWatchers.length === 0 &&
    residentEffects.length === 0 &&
    breedingResidentEffects.length === 0 &&
    !engine.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", source.ownerSeat)
  )
    return baseCost;
  // Seed `selections` so the interpreter's runEffect does NOT clone the context (it clones only
  // when `selections` is unset). The ReducePlayCost action writes the earned delta onto THIS
  // context's `playCostDelta`; a clone would strand the write and the reduction would be lost.
  const ctx: EffectContext = {
    ...engine.buildEffectContext(source, {
      wouldBePlayedInstanceId: instance.instanceId,
      wouldBePlayedCardId: instance.cardId,
      wouldBePlayedAsOption: useAsOption,
    }),
    selections: new Map(),
  };
  const playTarget = new Permanent();
  playTarget.permanentId = `pending-play-${instance.instanceId}`;
  playTarget.controllerSeat = source.ownerSeat;
  setTopCard(playTarget, instance);
  playTarget.inBreeding = false;
  playTarget.baseDP = source.definition.dp ?? 0;
  playTarget.currentDP = playTarget.baseDP;
  if (projectOnly) {
    const selfReduction = selfReducers.reduce(
      (total, reducer) => total + potentialWouldBePlayedSelfReduction(ctx, reducer),
      0,
    );
    const interactiveReduction = engine.subTriggers.potentialInteractiveReductionFor(
      "wouldBePlayed",
      source.ownerSeat,
      playTarget,
      source.definition,
      {
        hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
        markFired: (key) => engine.tracker.register(key, "replacement"),
      },
      originZone,
    );
    const turnBudget = {
      hasFired: (key: string) => engine.tracker.count(key, "replacement") > 0,
      markFired: (key: string) => engine.tracker.register(key, "replacement"),
    };
    const prospectiveBreedingReduction = breedingResidentEffects.reduce((total, { effect, source: residentSource }) => {
      if (effect.potentialPlayCostReduction === undefined) return total;
      if (
        effect.maxPerTurn > 0 &&
        engine.tracker.count(`${residentSource.instanceId}/${effect.effectKey}`, "replacement") > 0
      )
        return total;
      if (
        engine.subTriggers.hasInteractiveReductionForSource(
          "wouldBePlayed",
          source.ownerSeat,
          residentSource.instanceId,
          effect.effectKey,
          turnBudget,
        )
      )
        return total;
      const residentCtx: EffectContext = {
        ...engine.buildEffectContext(residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
      };
      if (!canTrigger(effect, residentCtx, engine.tracker) || !canActivate(effect, residentCtx, engine.tracker))
        return total;
      return total + effect.potentialPlayCostReduction(residentCtx, playTarget);
    }, 0);
    return Math.max(0, baseCost - selfReduction - interactiveReduction - prospectiveBreedingReduction);
  }
  // Everything below actually PAYS the reducers' costs. Mark the window so a cost deletion's
  // [On Deletion] joins engine play's trigger batch instead of resolving in its own window.
  const wasPayingPlayCost = engine.payingPlayCost;
  engine.payingPlayCost = true;
  try {
    for (const effect of effects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      if (!canTrigger(effect, ctx, engine.tracker)) continue;
      if (!canActivate(effect, ctx, engine.tracker)) continue;
      await effect.resolve(ctx);
    }
    // Generic battle-area pay-time watchers. Unlike the card being played, their
    // EffectContext source is the physical resident carrying the effect; the imminent
    // card identity is carried in TriggerInfo. This lets independent copies resolve and
    // account OPT separately while accumulating their reductions in the shared cost window.
    for (const { effect, source: residentSource } of residentEffects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      const residentCtx: EffectContext = {
        ...engine.buildEffectContext(residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, engine.tracker)) continue;
      if (!canActivate(effect, residentCtx, engine.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        engine.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // [Breeding] inherited pay-time effects are supplied by cards in the owner's
    // breeding-area stack (the card being played is still in hand, so its own
    // module cannot host the watcher). Resolve these against the same shared
    // play-cost context so their reductions are paid before memory is charged.
    for (const { effect, source: residentSource } of breedingResidentEffects) {
      if (reductionBlocked && effect.isPlayCostReduction === true) continue;
      const residentCtx: EffectContext = {
        ...engine.buildEffectContext(residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, engine.tracker)) continue;
      if (!canActivate(effect, residentCtx, engine.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        engine.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // Resolve interactive would-be-played subscriptions only after resident effects have run:
    // inherited [Breeding] reducers live in the breeding stack and install their subscription
    // during engine very pay-time pass, so consulting earlier would miss the current play entirely.
    const interactiveReduction = reductionBlocked
      ? 0
      : await engine.subTriggers.activateInteractiveReductionsFor(
          "wouldBePlayed",
          source.ownerSeat,
          playTarget,
          source.definition,
          undefined,
          (sourcePermanentId, sourceInstanceId) => {
            const resident =
              engine.access.permanentById(sourcePermanentId) ??
              (engine.state.players[source.ownerSeat]?.breeding?.permanentId === sourcePermanentId
                ? engine.state.players[source.ownerSeat]?.breeding
                : undefined);
            return resident?.topCard === undefined
              ? undefined
              : engine.buildEffectContext(
                  engine.cardSourceOf(findInstance(engine, sourceInstanceId ?? "")?.instance ?? resident.topCard),
                  {
                    wouldBePlayedInstanceId: instance.instanceId,
                    wouldBePlayedCardId: instance.cardId,
                    wouldBePlayedAsOption: useAsOption,
                  },
                );
          },
          {
            hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
            markFired: (key) => engine.tracker.register(key, "replacement"),
          },
          undefined,
          originZone,
        );
    if (interactiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + interactiveReduction;
    const passiveReduction = engine.continuous.blocksCostReduction(source.ownerSeat, "play")
      ? 0
      : engine.subTriggers.costReductionFor("wouldBePlayed", playTarget, source.definition, {
          consume: true,
          hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
          markFired: (key) => engine.tracker.register(key, "replacement"),
        });
    if (passiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + passiveReduction;
    // A prohibition nullifies the reduction, not the played card's own "by <cost>, reduce" clause:
    // its cost may still be paid (KB Q4443 — under Psychemon the 2 Digimon are suspended and the
    // original cost is paid), and the delta it earns is discarded below. A cost-less reducer has
    // nothing to offer while blocked.
    for (const reducer of selfReducers) {
      const paysSomething =
        reducer.cost !== undefined || reducer.pay !== undefined || reducer.costActions !== undefined;
      if (reductionBlocked && !paysSomething) continue;
      await applyWouldBePlayedSelfReducer(ctx, reducer);
    }
    // A self-reducer's cost body may have selected a permanent (BT12-112's chosen [Shoutmon]) to
    // relocate under the played card's own permanent — which does not exist yet at engine point. Stash
    // it for `placePendingDigivolution` to relocate once it does (see `pendingSelfReducerRelocations`).
    if (ctx.pendingSelfReducerRelocations && ctx.pendingSelfReducerRelocations.length > 0) {
      const pending = engine.pendingSelfReducerRelocations.get(instance.instanceId) ?? [];
      engine.pendingSelfReducerRelocations.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerRelocations]);
    }
    if (ctx.pendingSelfReducerPlacements && ctx.pendingSelfReducerPlacements.length > 0) {
      const pending = engine.pendingPlayReducerPlacements.get(instance.instanceId) ?? [];
      engine.pendingPlayReducerPlacements.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerPlacements]);
    }
    if (!reductionBlocked) await runCrossPermanentPlayReducers(engine, instance, ctx, crossWatchers);
    if (engine.continuous.blocksCostReduction(source.ownerSeat, "play")) return baseCost;
    const delta = Math.max(0, ctx.playCostDelta ?? 0);
    return Math.max(0, baseCost - delta);
  } finally {
    engine.payingPlayCost = wasPayingPlayCost;
  }
}

/** Resolve the in-hand half of BeforePayCost for an imminent digivolution. */
export async function fireBeforeDigivolveCost(
  engine: GameEngine,
  instance: CardInstance,
  target: Permanent,
): Promise<void> {
  const source = engine.cardSourceOf(instance);
  const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow === "digivolve");
  if (effects.length === 0) return;
  const ctx: EffectContext = {
    ...engine.buildEffectContext(source, { subjectPermanentId: target.permanentId }),
    selections: new Map(),
  };
  for (const effect of effects) {
    if (!canTrigger(effect, ctx, engine.tracker)) continue;
    if (!canActivate(effect, ctx, engine.tracker)) continue;
    await effect.resolve(ctx);
  }
}

/**
 * Resolve only `wouldBePlayed` replacements before an effect-driven DigiXros picker.
 * The ordinary BeforePayCost reducers remain at the canonical payment point; engine early seam
 * exists so a replacement can grant its material zones before the picker builds candidates.
 */
export async function prepareDigiXrosPlay(engine: GameEngine, instanceId: string): Promise<string[]> {
  const prepared = await prepareDigiXrosPlays(engine, [instanceId]);
  return prepared[instanceId] ?? [];
}

export async function prepareDigiXrosPlays(
  engine: GameEngine,
  instanceIds: readonly string[],
): Promise<Record<string, string[]>> {
  const targets: Permanent[] = [];
  for (const instanceId of instanceIds) {
    const instance = findLooseInstance(engine, instanceId);
    if (instance === undefined) continue;
    const source = engine.cardSourceOf(instance);
    const playTarget = new Permanent();
    playTarget.permanentId = `pending-play-${instance.instanceId}`;
    playTarget.controllerSeat = source.ownerSeat;
    setTopCard(playTarget, instance);
    playTarget.inBreeding = false;
    playTarget.baseDP = source.definition.dp ?? 0;
    playTarget.currentDP = playTarget.baseDP;
    targets.push(playTarget);
  }
  if (targets.length === 0) return {};
  const handledByPlay: Record<string, string[]> = Object.fromEntries(
    targets.map((target) => [target.topCard!.instanceId, []]),
  );
  await engine.subTriggers.activateInsteadReplacementsFor(
    "wouldBePlayed",
    targets,
    (sourcePermanentId, sourceInstanceId, targetInstanceId) => {
      const pendingInstance = findLooseInstance(engine, targetInstanceId ?? targets[0]!.topCard!.instanceId);
      const pendingOwnerSeat = pendingInstance?.ownerSeat ?? targets[0]!.controllerSeat;
      const resident =
        engine.access.permanentById(sourcePermanentId) ??
        (engine.state.players[pendingOwnerSeat]?.breeding?.permanentId === sourcePermanentId
          ? engine.state.players[pendingOwnerSeat]?.breeding
          : undefined);
      const sourceCard = findInstance(engine, sourceInstanceId ?? "")?.instance ?? resident?.topCard;
      if (sourceCard === undefined) return undefined;
      return {
        ...engine.buildEffectContext(engine.cardSourceOf(sourceCard), {
          wouldBePlayedInstanceId: targetInstanceId ?? targets[0]!.topCard!.instanceId,
          wouldBePlayedCardId:
            findLooseInstance(engine, targetInstanceId ?? targets[0]!.topCard!.instanceId)?.cardId ??
            targets[0]!.topCard!.cardId,
          wouldBePlayedAsOption: false,
        }),
        selections: new Map(),
      };
    },
    {
      hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
      markFired: (key) => engine.tracker.register(key, "replacement"),
    },
    (replacement, targetInstanceIds) => {
      // The static picker represents the same printed ability. An offered source stays
      // handled after refusal so it cannot receive a second activation offer for engine play.
      if (replacement.sourcePermanentId !== undefined) {
        for (const pendingId of targetInstanceIds ?? []) {
          (handledByPlay[pendingId] ??= []).push(replacement.sourcePermanentId);
        }
      }
    },
  );
  return handledByPlay;
}

/** Battle-area effects that react while their controller would play/use another card. */
export function residentPlayCostEffects(engine: GameEngine, seat: Seat): Array<{ effect: Effect; source: CardSource }> {
  const player = engine.state.players[seat];
  if (player === undefined) return [];
  return Array.from(player.battleArea).flatMap((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return [];
    return [permanent.topCard, ...permanent.stack].flatMap((card, index) => {
      const residentSource = engine.cardSourceOf(card);
      return effectsOf(EffectTiming.BeforePayCost, residentSource)
        .filter((effect) => effect.costWindow !== "digivolve")
        .filter((effect) => index === 0 || effect.isInherited)
        .map((effect) => ({ effect, source: residentSource }));
    });
  });
}

/**
 * Battle-area permanents the playing seat controls that carry a VERIFIED cross-permanent play-cost
 * reducer matching the card being played. BT10-093 handles Lv.4+ [Bagra Army] Digimon; EX3-040
 * handles green Digimon by suspending the Parasaurmon carrying the effect.
 * These reducers live on a watcher, not the played card, so `wouldBePlayedSelfReducersFor` (keyed
 * on the played card's own id) does not cover them. The accepted card IDs are explicit because
 * generated cross-card Replacement IR can omit decisive source/subject identity.
 */
export function crossPermanentPlayReducerWatchers(engine: GameEngine, instance: CardInstance, seat: Seat): Permanent[] {
  const def = lookupDefinition(instance.cardId);
  if (def === undefined) return [];
  const isLv4PlusBagraArmy =
    def.kinds.includes(CardKind.Digimon) &&
    def.level !== undefined &&
    def.level >= 4 &&
    (cardHasTrait(def, "Bagra Army") || cardHasTrait(def, "BagraArmy"));
  const player = engine.state.players[seat];
  if (player === undefined) return [];
  const isBossOrTsDigimon =
    def.kinds.includes(CardKind.Digimon) && (cardHasTrait(def, "Boss") || cardHasTrait(def, "TS"));
  return player.battleArea.filter((perm) => {
    if (perm.inBreeding) return false;
    if (perm.topCard?.cardId === "BT10-093") return isLv4PlusBagraArmy;
    if (perm.topCard?.cardId === "BT26-088") {
      return (
        isBossOrTsDigimon &&
        !perm.isSuspended &&
        !engine.continuous.hasRestriction(perm.permanentId, "beSuspended") &&
        !engine.continuous.hasRestriction(perm.permanentId, "beAffected")
      );
    }
    return false;
  });
}

/**
 * Run each verified cross-permanent reducer. Decisions use the watcher's own context so the UI
 * attributes the printed clause to the permanent providing the reduction, not the card in hand.
 */
export async function runCrossPermanentPlayReducers(
  engine: GameEngine,
  instance: CardInstance,
  ctx: EffectContext,
  watchers: Permanent[],
): Promise<void> {
  if (watchers.length === 0) return;
  const seat = ctx.source.ownerSeat;
  const player = engine.state.players[seat];
  if (player === undefined) return;
  for (const watcher of watchers) {
    if (watcher.topCard?.cardId === "BT26-088") {
      const watcherSource = engine.cardSourceOf(watcher.topCard);
      const watcherCtx: EffectContext = {
        ...engine.buildEffectContext(watcherSource, {}),
        selections: new Map(),
        activeTiming: "YourTurn",
        activeEffectText:
          "[Your Turn] When a [Boss] or [TS] Digimon would be played, by suspending engine Tamer, reduce the cost.",
      };
      if (!(await watcherCtx.ask.optional(watcherCtx, "Suspend Hiroko Sagisaka to reduce engine play cost?"))) {
        continue;
      }
      const paid = watcherCtx.fx.payActivationCost?.(watcher.permanentId, "suspend") ?? false;
      if (!paid) continue;
      const hasDigimon = player.battleArea.some((permanent) => {
        if (permanent.inBreeding || permanent.topCard === undefined) return false;
        return lookupDefinition(permanent.topCard.cardId)?.kinds.includes(CardKind.Digimon) === true;
      });
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + (hasDigimon ? 1 : 2);
      continue;
    }
    const key = `crossPlayReducer:${watcher.permanentId}`;
    if (engine.tracker.count(key, "crossReducer") > 0) continue;
    const candidates = purpleDigimonUnderTamers(engine, player);
    if (candidates.length === 0) continue;
    const prompt =
      "BT10-093: place up to 3 purple Digimon from under your Tamers as digivolution cards to reduce the play cost by 2 each?";
    if (!(await ctx.ask.optional(ctx, prompt))) continue;
    engine.tracker.register(key, "crossReducer");
    const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 3 });
    if (chosen.length === 0) continue;
    ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 2 * chosen.length;
    const pending = engine.pendingPlayReducerPlacements.get(instance.instanceId) ?? [];
    engine.pendingPlayReducerPlacements.set(instance.instanceId, [...pending, ...chosen]);
  }
}

/** InstanceIds of purple Digimon sitting in the digivolution stacks of the seat's Tamers. */
export function purpleDigimonUnderTamers(engine: GameEngine, player: PlayerState): string[] {
  const out: string[] = [];
  for (const perm of player.battleArea) {
    const topDef = perm.topCard ? lookupDefinition(perm.topCard.cardId) : undefined;
    if (topDef === undefined || !topDef.kinds.includes(CardKind.Tamer)) continue;
    for (const card of perm.stack) {
      const def = lookupDefinition(card.cardId);
      if (def === undefined) continue;
      if (def.kinds.includes(CardKind.Digimon) && def.colors.includes("Purple" as CardColor)) {
        out.push(card.instanceId);
      }
    }
  }
  return out;
}
