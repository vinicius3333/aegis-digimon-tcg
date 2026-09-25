import { EffectTiming, type Seat } from "@aegis/shared";
import { rootZoneOfLooseInstance } from "../effects/primitives.js";
import { type SubTriggerSubscription, type SubTriggerTurnLedger } from "../effects/subtriggers.js";
import { permanentIdentityOf } from "../effects/index.js";
import type { CardSource } from "../effects/CardSource.js";
import type { CollectedEffect } from "../effects/collect.js";
import type {
  DiscardedStackSourceProof,
  EffectContext,
  TriggerInfo,
  SubTriggerEventName,
  SubTriggerSourceScope,
} from "../effects/EffectContext.js";
import {
  subTriggerDescriptionFor,
  subTriggerIdentity,
  uniqueOncePerTurnWatcherOccurrences,
  type ArmedSubTrigger,
} from "./subTriggerIdentity.js";
import { findLooseInstance } from "./intents.js";
import type { GameEngine } from "../GameEngine.js";
import { shouldDeferNestedTiming, withTriggeredMutations } from "./windows.js";
import { buildEffectContext, cardSourceOf } from "./effectContext.js";
import { drainPendingAttackTriggers } from "./timing/fire.js";

/**
 * @param sourceScope Restricts the fire to watchers anchored ON the event subject
 *   (`selfSourceOnly`) or anchored anywhere else (`excludeSelfSource`). Omitted => every
 *   armed watcher runs, which is what all callers but the deletion seam want.
 */
export async function fireSubTrigger(
  engine: GameEngine,
  event: SubTriggerEventName,
  payload: TriggerInfo = {},
  sourceScope?: SubTriggerSourceScope,
): Promise<void> {
  const scopedOut = (sub: SubTriggerSubscription): boolean => {
    if (sourceScope === undefined) return false;
    const isSelfSource = sub.sourcePermanentId === payload.deletedPermanentId;
    return sourceScope === "selfSourceOnly" ? !isSelfSource : isSelfSource;
  };
  const subscriptionsFor = (): SubTriggerSubscription[] =>
    engine.subTriggers.subscriptionsFor(event).filter((sub) => !scopedOut(sub));
  const deletedPermanent =
    payload.deletedPermanentId === undefined ? undefined : engine.access.permanentById(payload.deletedPermanentId);
  if (deletedPermanent !== undefined) {
    payload = {
      deletedControllerSeat: deletedPermanent.controllerSeat,
      deletedTopCardId: deletedPermanent.topCard?.cardId,
      deletedDigivolutionCardCount: deletedPermanent.stack.length,
      ...payload,
    };
  }
  if (engine.ruleProcessing && !engine.resolvingBarrierSecurityCost) {
    const subscriptions = subscriptionsFor();
    const contexts = new Map<number, EffectContext>();
    for (const sub of subscriptions) {
      const context = buildSubTriggerContext(engine, sub, payload);
      if (context !== undefined) contexts.set(sub.id, context);
    }
    const armed = armedSubTriggers(engine, subscriptions, payload, contexts).map((item) => {
      // A triggered effect granted to the Digimon being deleted has to retain that
      // Digimon's last live context (BT15-039). Other watchers have only met their
      // trigger condition: they have not activated yet, so their source must still
      // exist after the rule-process fixpoint (BT25-084/Q6399).
      if (event === "onDeletionOf" && item.sub.sourcePermanentId === payload.deletedPermanentId) return item;
      return {
        ...item,
        contextAtFireTime: () => buildSubTriggerContext(engine, item.sub, payload),
      };
    });
    engine.deferredRuleSubTriggers.push({
      event,
      payload: {
        turnSeat: engine.state.turnSeat,
        ...payload,
      },
      armed,
    });
    return;
  }
  // A third-party "when [something] is deleted" watcher and the deleted cards'
  // [On Deletion] effects trigger from the same deletion event (CR §15-4). Capture the
  // watcher while the subject is still on the field, where its source filter can inspect
  // the subject's last live state, but let the ensuing OnDestroyedAnyone window activate
  // both effects from one ordered pool. Self-anchored onDeletionOf clauses are deliberately
  // excluded: the deletion verb runs those before leave prevention (EX3-013/Q2212).
  if (event === "onDeletionOf" && sourceScope === "excludeSelfSource") {
    const subscriptions = subscriptionsFor();
    const contexts = new Map<number, EffectContext>();
    for (const sub of subscriptions) {
      const context = buildSubTriggerContext(engine, sub, payload);
      if (context !== undefined) contexts.set(sub.id, context);
    }
    engine.pendingDeletionSubTriggers.push(...armedSubTriggers(engine, subscriptions, payload, contexts));
    return;
  }
  // A security card removed while another effect is resolving creates a pending trigger;
  // it does not interrupt that effect. Dynasmon BT6-044 must finish revealing its 6 cards
  // before its Recovery reaction can consume the next deck card (KB Q1430/Q1432).
  if (
    event === "whenSecurityRemoved" &&
    engine.activeWindowToken !== undefined &&
    !engine.resolvingBarrierSecurityCost &&
    !engine.flushingDeferredSecurityRemovalTriggers
  ) {
    const pending = [...engine.subTriggers.subscriptionsFor(event)];
    const boundPayload = { ...payload };
    const contexts = new Map<number, EffectContext>();
    for (const sub of pending) {
      const ctx = buildSubTriggerContext(engine, sub, boundPayload);
      if (ctx !== undefined) contexts.set(sub.id, ctx);
    }
    engine.deferredSecurityRemovalTriggers.push({
      payload: boundPayload,
      subscriptions: pending,
      contexts,
    });
    return;
  }
  // A would-be-returned reaction interrupts the causing effect before its target moves
  // (CR 15-8-5; BT20-074 Q4400). Deferring it loses the original Digimon first.
  if (event !== "wouldBeReturned" && shouldDeferNestedTiming(engine) && !engine.resolvingBarrierSecurityCost) {
    // The event subject can leave the board before the causing effect finishes. Bind each
    // context now, at trigger time, so the pending activation keeps the subject snapshot
    // required by CR §15-4-4 instead of re-running its filter against an already-moved card.
    const subscriptions = subscriptionsFor();
    const contexts = new Map<number, EffectContext>();
    for (const sub of subscriptions) {
      const ctx = buildSubTriggerContext(engine, sub, payload);
      if (ctx !== undefined) contexts.set(sub.id, ctx);
    }
    engine.pendingWindowSubTriggers.push(...armedSubTriggers(engine, subscriptions, payload, contexts));
    return;
  }
  // A SubTrigger body is a triggered, duration-scoped effect even when its watcher was
  // discovered while the engine was re-deriving continuous effects (see
  // {@link withTriggeredMutations}).
  await withTriggeredMutations(engine, async () => {
    // One event can arm SEVERAL watchers at once: two copies of Xeno EX11-066 both watch
    // "when your Digimon digivolves", and a link operation arms both the recipient's watchers
    // and the newly linked card's [When Linking] face. Simultaneous triggers of one player are
    // ordered BY THAT PLAYER (CR §15-4), so snapshot the matching watchers and let the
    // controller pick the next one exactly like a normal timing window. `whenLinked` always
    // takes engine path — its ordering is observable for BT26-084/Q7128, whose link face can
    // recursively link a card mid-window.
    //
    // An ordered window resolves ONLY what its snapshot armed: a body can drive a continuous
    // recompute, which tears down and RE-INSTALLS every continuous watcher under fresh ids, so
    // a second pass over a re-queried list would fire the same watcher twice. The set of
    // simultaneous triggers is fixed when the event happens anyway. The single-watcher case
    // keeps the plain pass below — no snapshot, no prompt, and a `matches` gate that only
    // becomes true once an earlier body has resolved still gets its chance.
    const armed = armedSubTriggers(engine, subscriptionsFor(), payload);
    if (event === "whenLinked" || armed.length > 1) {
      await runSubTriggersInChosenOrder(engine, armed);
    } else {
      await engine.subTriggers.fire(
        event,
        (sub) => buildSubTriggerContext(engine, sub, payload),
        undefined,
        // The ambient resolving-effect window (see `beginResolvingWindow`): undefined when
        // engine fire happens outside any fireTiming/fireTimingForInstance call (no dedup —
        // fail-open, matching SubTriggerRegistry.fire's documented default), otherwise the
        // ID of the outermost effect resolution currently in progress, so an `oncePerTiming`
        // watcher dedupes across multiple plays/events from ONE resolving effect (KB Q2814)
        // while still firing once per genuinely separate top-level resolution.
        engine.activeWindowToken,
        subTriggerTurnLedger(engine),
        (sub) => scopedOut(sub) || engine.consumedSubTriggerKeys.has(subTriggerIdentity(sub)),
        (sub, ctx) => announceSubTrigger(engine, sub, ctx),
      );
    }
  });
  // A watcher body may have moved/deleted permanents; refresh the continuous tier so a
  // subsequent read sees the post-fire board (mirrors fireTiming's trailing recompute).
  // A batch stack-card event is immediately followed by one per-card event at the same
  // primitive seam. Keep continuous inherited watchers installed until those per-card events
  // have had a chance to fire; recomputing here would remove a source card that has already
  // moved and erase its exact-card watcher before the canonical event (P-167/BT10-006).
  if (event !== "onDigivolutionCardsDiscardedBatch") await engine.recomputeContinuousEffects();
}

/**
 * Capture the watchers armed when an event occurs, then return a deferred activation.
 * This is distinct from a nested timing deferral: combat deliberately resolves its
 * System-A [When Attacking] window before the System-B watcher bus, but both systems
 * observe the same attack declaration. A watcher installed by an earlier System-A
 * effect therefore must not retroactively join that declaration (BT24-078/Q5775).
 */
export function prepareSubTrigger(
  engine: GameEngine,
  event: SubTriggerEventName,
  payload: TriggerInfo,
): () => Promise<void> {
  const boundPayload = { ...payload };
  const subscriptions = [...engine.subTriggers.subscriptionsFor(event)];
  const contexts = new Map<number, EffectContext>();
  for (const sub of subscriptions) {
    const ctx = buildSubTriggerContext(engine, sub, boundPayload);
    if (ctx !== undefined) contexts.set(sub.id, ctx);
  }
  return async () => {
    await withTriggeredMutations(engine, async () => {
      await fireSubTriggerSnapshot(engine, subscriptions, boundPayload, contexts);
    });
  };
}

/**
 * Capture a SubTrigger's eligibility at the event boundary and defer only its activation.
 *
 * Battle deletion has a small but important ordering seam: the losing permanent must leave
 * the field before continuous effects are refreshed (so a conditional ＜Piercing＞ can become
 * active), while the battle's `whenBattleWon`/`onDeletionOf` reactions must not be allowed to
 * mutate that refreshed state before Piercing is captured. The ordinary `prepareSubTrigger`
 * path intentionally re-checks `matches`/`canFire` when its callback runs; that is correct for
 * attack watchers, but would make a deletion watcher observe the post-removal board. This
 * variant freezes those two event predicates and the source context immediately, then runs
 * the already-armed body later.
 *
 * The cloned subscription clears only the live predicates. It retains the original id and all
 * lifecycle/once fields, so `fireSnapshot` still enforces once-per-turn and once-per-timing
 * ledgers, while the bound context allows a watcher whose source was just deleted to resolve.
 */
export function prepareFrozenSubTrigger(
  engine: GameEngine,
  event: SubTriggerEventName,
  payload: TriggerInfo,
): () => Promise<void> {
  let boundPayload = { ...payload };
  const deletedPermanent =
    payload.deletedPermanentId === undefined ? undefined : engine.access.permanentById(payload.deletedPermanentId);
  if (deletedPermanent !== undefined) {
    boundPayload = {
      deletedControllerSeat: deletedPermanent.controllerSeat,
      deletedTopCardId: deletedPermanent.topCard?.cardId,
      deletedDigivolutionCardCount: deletedPermanent.stack.length,
      ...boundPayload,
    };
  }

  const subscriptions = [...engine.subTriggers.subscriptionsFor(event)];
  const contexts = new Map<number, EffectContext>();
  for (const sub of subscriptions) {
    const context = buildSubTriggerContext(engine, sub, boundPayload);
    if (context !== undefined) contexts.set(sub.id, context);
  }

  // `armedSubTriggers` is deliberately called NOW: it evaluates matches/canFire against the
  // live event state and captures the shared Once Per Turn occurrence. A later continuous
  // recompute or reaction must not add a watcher to engine event or make an unarmed one eligible.
  const frozen = armedSubTriggers(engine, subscriptions, boundPayload, contexts).map((item) => ({
    ...item,
    // `runSubTriggersInChosenOrder` performs its normal liveness re-check before every body,
    // and `fireSnapshot` checks `matches` again. For engine event-locked path those predicates
    // have already been evaluated above; clearing them on the private snapshot preserves the
    // event result without mutating the registry's original subscription.
    sub: { ...item.sub, matches: undefined, canFire: undefined },
    contextAtFireTime: () => {
      // A watcher on a surviving Digimon is still only pending. Another effect in
      // this simultaneous deletion group may remove its source before it activates.
      // A watcher on a Digimon deleted by this very event keeps its last-live source.
      const sourceId = item.sub.sourcePermanentId;
      if (
        (event === "onDeletionOf" || event === "whenLeavesPlay") &&
        sourceId !== undefined &&
        !boundPayload.deletedPermanentIds?.includes(sourceId) &&
        buildSubTriggerContext(engine, item.sub, boundPayload) === undefined
      )
        return undefined;
      return item.ctx;
    },
  }));

  return async () => {
    if (frozen.length === 0) return;
    if ((event === "onDeletionOf" || event === "whenLeavesPlay") && engine.ruleTriggerPool === undefined) {
      // Battle captures these watchers while the deleted subjects are still live, then
      // calls their callbacks after moving the entire deletion batch. They belong to
      // that batch's On Deletion window, alongside the deleted cards' printed effects.
      // A watcher may match both combatants; one deletion event activates it once.
      const claimed = new Set(engine.pendingDeletionSubTriggers.map((item) => subTriggerIdentity(item.sub)));
      for (const item of frozen) {
        const key = subTriggerIdentity(item.sub);
        if (claimed.has(key) || engine.consumedSubTriggerKeys.has(key)) continue;
        engine.pendingDeletionSubTriggers.push(item);
        claimed.add(key);
      }
      return;
    }
    // A battle started by a resolving effect (EX13-045 "may battle") must not interrupt it:
    // the battle-result watchers join the pool that already holds the same effect's attack
    // declaration triggers, and the turn player orders them together (CR §15-4, Q7366).
    if (shouldDeferNestedTiming(engine) && !engine.resolvingBarrierSecurityCost) {
      const hostStillResident = (item: ArmedSubTrigger): boolean =>
        event !== "whenDeletesInBattle" ||
        item.sub.sourcePermanentId === undefined ||
        engine.access.permanentById(item.sub.sourcePermanentId) !== undefined;
      engine.pendingWindowSubTriggers.push(
        ...frozen
          .filter((item) => !engine.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)))
          .map((item) => ({
            ...item,
            contextAtFireTime: () => (hostStillResident(item) ? item.contextAtFireTime() : undefined),
          })),
      );
      return;
    }
    await withTriggeredMutations(engine, async () => {
      const remaining = frozen.filter(
        (item) =>
          !engine.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)) &&
          // Unlike [On Deletion], this is an external battle-result watcher. Its trigger
          // subject may have traded with the opponent, but the permanent hosting the watcher
          // must still exist when the effect activates (Q7339).
          (event !== "whenDeletesInBattle" ||
            item.sub.sourcePermanentId === undefined ||
            engine.access.permanentById(item.sub.sourcePermanentId) !== undefined),
      );
      if (remaining.length > 0) {
        // Combat prepares one frozen deletion reaction per deleted permanent so filters can
        // inspect each subject's last live state. They are nevertheless one simultaneous
        // deletion event: a watcher that matched the first subject must not activate again
        // from the second subject with the same batch payload. Keep the event identity claimed
        // until the surrounding timing window closes; watchers that only match a later subject
        // remain unclaimed and can still activate there.
        for (const item of remaining) engine.consumedSubTriggerKeys.add(subTriggerIdentity(item.sub));
        await runSubTriggersInChosenOrder(engine, remaining);
      }
    });
    await engine.recomputeContinuousEffects();
  };
}

/**
 * The watchers in `subs` that ACTUALLY trigger for `payload`, each paired with the context
 * bound at the moment the event fired. Filters what the ordering prompt must not offer: a
 * watcher already consumed by the surrounding timing window, one whose `[Once Per Turn]`
 * ledger entry is spent, one whose anchor is gone, one whose `matches` gate rejects the
 * event, and one that could not act anyway (`canFire`, e.g. an unpayable self-suspend cost).
 */
export function armedSubTriggers(
  engine: GameEngine,
  subs: readonly SubTriggerSubscription[],
  payload: TriggerInfo,
  boundContexts?: ReadonlyMap<number, EffectContext>,
): ArmedSubTrigger[] {
  const armed: ArmedSubTrigger[] = [];

  // Capture the per-turn budget at the event boundary. Distinct action-path clauses sharing
  // one printed [Once Per Turn] are simultaneous and all remain eligible in engine snapshot
  // (EX4-014/Q3456), even after the first body provisionally marks the shared key. A later
  // event gets a fresh snapshot and therefore sees the consumed ledger entry.
  const oncePerTurnSnapshotKeys = new Set(
    subs
      .filter((sub) => sub.oncePerTurnKey !== undefined && engine.tracker.count(sub.oncePerTurnKey, "subtrigger") === 0)
      .map((sub) => sub.oncePerTurnKey!)
      .filter((key, index, keys) => keys.indexOf(key) === index),
  );
  const occurrence = {
    oncePerTurnSnapshotKeys,
    oncePerTurnSuccessfulKeys: new Set<string>(),
  };

  for (const sub of subs) {
    if (engine.consumedSubTriggerKeys.has(subTriggerIdentity(sub))) continue;
    if (sub.oncePerTurnKey !== undefined && engine.tracker.count(sub.oncePerTurnKey, "subtrigger") > 0) continue;
    const ctx = boundContexts?.get(sub.id) ?? buildSubTriggerContext(engine, sub, payload);
    if (ctx === undefined) continue;
    if (sub.matches !== undefined && !sub.matches(ctx)) continue;
    if (sub.canFire !== undefined && !sub.canFire(ctx)) continue;
    armed.push({
      sub,
      ctx,
      occurrence,
      contextAtFireTime: () =>
        boundContexts?.get(sub.id) === undefined
          ? buildSubTriggerContext(engine, sub, payload)
          : boundContexts.get(sub.id),
    });
  }

  return armed;
}

/**
 * `oncePerTurnKey` ledger: reuses the SAME per-turn UseTracker the kernel's maxPerTurn and the
 * leave-prevention "replacement" keys use, namespaced with "subtrigger" so the three ledgers
 * never collide. Resets with everything else at `ownerTurnStart` (see `clearDurations`).
 */
export function subTriggerTurnLedger(engine: GameEngine): SubTriggerTurnLedger {
  return {
    hasFired: (key) => engine.tracker.count(key, "subtrigger") > 0,
    markFired: (key) => engine.tracker.register(key, "subtrigger"),
    unmarkFired: (key) => engine.tracker.unregister(key, "subtrigger"),
  };
}

/**
 * Resolve simultaneous watchers one at a time, letting the controller pick the next one
 * (CR §15-4: the turn player orders their own simultaneous triggers first, then the
 * opponent theirs). A lone watcher resolves without a prompt.
 */
export async function runSubTriggersInChosenOrder(
  engine: GameEngine,
  armed: readonly ArmedSubTrigger[],
): Promise<void> {
  // Nested resolution can expose the same armed watcher through both the
  // enclosing deletion window and its resumed remainder. A printed
  // [Once Per Turn] effect is still one occurrence in that simultaneous
  // group; distinct clauses remain separate because their identity carries
  // a different dedupeKey.
  const remaining = uniqueOncePerTurnWatcherOccurrences(armed);
  // A watcher body that orders an attack pauses at the declaration (CR 11-1-4, KB Q819/Q3625):
  // the attack's [When Attacking] effects and then the watchers still pending from this same
  // event resolve before Counter Timing. The attack reaches this loop through the watcher
  // context's `drainCurrentTimingWindow`, which empties `remaining` so nothing re-fires after
  // combat.
  const drainRemaining = async (): Promise<void> => {
    await drainPendingAttackTriggers(engine);
    await resolveRemaining();
  };
  const resolveRemaining = async (): Promise<void> => {
    while (remaining.length > 0) {
      // Drop watchers whose trigger condition lapsed while an earlier one resolved, so the
      // ordering prompt never offers an effect that can no longer activate (CR §15-4-4-5).
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        if (!subTriggerStillActivatable(engine, remaining[index]!)) remaining.splice(index, 1);
      }
      if (remaining.length === 0) break;
      const orderingSeatOfArmed = (item: ArmedSubTrigger): Seat =>
        item.sub.orderedByTurnPlayer === true ? engine.state.turnSeat : item.ctx.source.ownerSeat;
      const prioritySeat = remaining.some((item) => orderingSeatOfArmed(item) === engine.state.turnSeat)
        ? engine.state.turnSeat
        : orderingSeatOfArmed(remaining[0]!);
      const sameController = remaining.filter((item) => orderingSeatOfArmed(item) === prioritySeat);
      let chosen = sameController[0]!;
      if (sameController.length > 1) {
        const index = await engine.resolverDecisions.chooseOrder(
          prioritySeat,
          sameController.map((item) => subTriggerAsCollected(engine, item)),
        );
        if (index !== null) chosen = sameController[index] ?? chosen;
      }
      remaining.splice(remaining.indexOf(chosen), 1);
      await fireOneSubTrigger(engine, chosen, {
        drainCurrentTimingWindow: drainRemaining,
      });
    }
  };
  await resolveRemaining();
}

/**
 * The watchers armed for the enclosing window's event, as collected effects the resolver can
 * order against the printed ones. Each keeps its own body: the resolver builds a context from
 * the watcher's source for the ordering prompt, but the watcher runs through
 * `fireOneSubTrigger`, so its `matches` / `once` / `oncePerTiming` / `[Once Per Turn]` ledgers
 * behave exactly as they do on the SubTrigger bus.
 */
/**
 * CR §15-4-4-3/-5 at the between-windows boundary: a parked trigger whose source card is no
 * longer the same thing on the same permanent it was when the trigger was collected can no
 * longer activate. A source that was never on a permanent (a trash- or hand-resident clause,
 * or an [On Deletion] whose card is already gone) makes no residency claim and is left alone —
 * the play-cost deletion list (`pendingPlayCostDeletionEffects`) is deliberately not filtered
 * here at all, since its source was deleted to pay the cost by design (Q5131).
 */
export function nestedTriggerSourceStillResident(engine: GameEngine, pending: CollectedEffect): boolean {
  // §15-8-3-5: an inherited [On Deletion] effect is pending for the former top card of the
  // deleted stack. Its permanent identity necessarily changes/disappears, but engine exception
  // is valid only when the event snapshot still proves that exact source/host relationship.
  const trigger = pending.triggerInfo;
  const deletedHostId = trigger?.deletedHostInstanceByInstanceId?.[pending.source.instanceId];
  const inheritedDeletedSource =
    pending.timing === EffectTiming.OnDestroyedAnyone &&
    pending.effect.isInherited === true &&
    trigger?.deletedWasStackInstanceIds?.includes(pending.source.instanceId) === true &&
    trigger.deletedInstanceIds?.includes(pending.source.instanceId) === true &&
    deletedHostId !== undefined &&
    trigger.deletedInstanceIds?.includes(deletedHostId) === true &&
    rootZoneOfLooseInstance(engine.state, pending.source.instanceId) === "trash" &&
    rootZoneOfLooseInstance(engine.state, deletedHostId) === "trash";
  if (inheritedDeletedSource) return true;
  const identityAtDefer = engine.nestedTriggerSourceIdentity.get(pending);
  if (identityAtDefer === undefined || identityAtDefer === null) return true;
  return permanentIdentityOf(pending.source) === identityAtDefer;
}

/** Armed watchers as collected effects the resolver can order against the printed ones. */
export function armedAsPendingCollected(engine: GameEngine, items: readonly ArmedSubTrigger[]): CollectedEffect[] {
  return items.map((item) => {
    const collected = subTriggerAsCollected(engine, item);
    return {
      ...collected,
      // The resolver announces what it resolves, so engine body must not announce itself.
      effect: {
        ...collected.effect,
        resolve: async (resolverCtx: EffectContext) => {
          // Retire the pending trigger before its body can open another window, mirroring
          // `resolutionDeps.onResolving` for the printed half of the same pool.
          engine.parkedEntrySubTriggers = engine.parkedEntrySubTriggers.filter((entry) => entry !== item);
          engine.pendingWindowSubTriggers = engine.pendingWindowSubTriggers.filter((entry) => entry !== item);
          await fireOneSubTrigger(engine, item, {
            announce: false,
            drainCurrentTimingWindow: resolverCtx.drainCurrentTimingWindow,
          });
        },
      },
    };
  });
}

/**
 * The parked half of an entry event (see {@link parkArmedForEnclosingWindow}). Offered to EVERY
 * resolution loop, outermost or not: unlike the enclosing window's own watchers these belong to
 * an event that already happened inside the running body, and the loop that drains them is not
 * always the outermost one (a replacement play's loop, EX11-058). A parked watcher already
 * claimed its identity, so the consumed-key filter would hide it and is not applied here.
 */
export function parkedEntryCollected(engine: GameEngine): CollectedEffect[] {
  return armedAsPendingCollected(
    engine,
    engine.parkedEntrySubTriggers.filter(
      (item) =>
        // Entry-event watchers have only triggered; they have not activated yet. If an
        // earlier simultaneous effect removes their field source, they must leave the pool.
        // Keep this residency rule scoped to parked entry watchers: frozen deletion watchers
        // intentionally retain their last-live source context after that source is deleted.
        (item.sub.sourcePermanentId === undefined ||
          engine.access.permanentById(item.sub.sourcePermanentId) !== undefined) &&
        subTriggerStillActivatable(engine, item),
    ),
  );
}

/**
 * Sub-trigger events whose SUBJECT is a breeding-area permanent by definition. They are the
 * "effects that explicitly specify or reference breeding areas" exception in Comprehensive
 * Rules §3-4-5-6, so the breeding-visibility guard below must never drop them.
 */
const BREEDING_SUBJECT_EVENTS: ReadonlySet<SubTriggerEventName> = new Set([
  "whenHatch",
  "whenMovedFromBreeding",
  "whenOpponentMovedFromBreeding",
]);

export function pendingWindowCollected(engine: GameEngine): CollectedEffect[] {
  return [
    ...engine.pendingNestedTimingEffects.filter((pending) => nestedTriggerSourceStillResident(engine, pending)),
    ...parkedEntryCollected(engine),
    ...armedAsPendingCollected(
      engine,
      uniqueOncePerTurnWatcherOccurrences(
        engine.pendingWindowSubTriggers.filter(
          (item) =>
            !engine.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)) &&
            subTriggerStillActivatable(engine, item),
        ),
      ),
    ),
  ];
}

/**
 * Run `fireWindows` — the timing windows for one event — with that event's SubTrigger watchers
 * folded into them, so one player orders their printed effects and their watchers in a SINGLE
 * prompt and can interleave them (CR §15-4). Mirrors the reference implementation, where a
 * digivolution stacks every triggered effect into one list and resolves it one at a time.
 *
 * Whatever the windows did not resolve fires afterwards, still ordered. Watchers armed DURING
 * the windows are picked up by the trailing bus fire, which skips the ones already consumed.
 */
export async function withPendingSubTriggers(
  engine: GameEngine,
  events: readonly SubTriggerEventName[],
  payload: TriggerInfo | undefined,
  fireWindows: () => Promise<void>,
  opts: {
    busTrigger?: () => TriggerInfo | undefined;
    onlyInitiallyArmed?: boolean;
    /**
     * True when engine event's OWN printed effects were parked for the enclosing window
     * instead of resolving here (see {@link shouldDeferNestedTiming}). The watchers armed by
     * the SAME event are simultaneous with those printed effects (CR §15-4), so they must be
     * parked next to them rather than fired on the trailing bus, which would run them first.
     */
    parkArmedToEnclosingWindow?: () => boolean;
  } = {},
): Promise<void> {
  // A rule sweep parks watchers wholesale (see fireSubTrigger); leave that path alone.
  const armed =
    engine.ruleProcessing || payload === undefined
      ? []
      : events.flatMap((event) => armedSubTriggers(engine, engine.subTriggers.subscriptionsFor(event), payload));
  const busFire = async (): Promise<void> => {
    if (opts.onlyInitiallyArmed === true) {
      const remaining = armed.filter((item) => !engine.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)));
      await withTriggeredMutations(engine, () => runSubTriggersInChosenOrder(engine, remaining));
      return;
    }
    const trigger = opts.busTrigger === undefined ? payload : opts.busTrigger();
    if (trigger === undefined) return;
    for (const event of events) await engine.fireSubTrigger(event, trigger);
  };
  if (armed.length === 0) {
    await fireWindows();
    await busFire();
    return;
  }
  const enclosing = engine.pendingWindowSubTriggers;
  const parkedPrintedEffectsBefore = engine.pendingNestedTimingEffects.length;
  engine.pendingWindowSubTriggers = [...enclosing, ...armed];
  engine.subTriggerWindowDepth += 1;
  try {
    try {
      await fireWindows();
    } finally {
      engine.pendingWindowSubTriggers = enclosing;
    }
    // Park only when the enclosing resolution is going to continue past engine play and drain the
    // pool: either engine event's own printed half just went there, or a used Option is still
    // routing its clauses. Otherwise nothing would ever pick the parked watchers up — the play
    // seams that resolve outside a continuing resolution (a replacement effect applying
    // mid-play, EX11-058) have no later pass — so those resolve their watchers where they stand.
    const enclosingResolutionContinues =
      engine.pendingNestedTimingEffects.length > parkedPrintedEffectsBefore || engine.optionResolutionDepth > 0;
    if (
      opts.parkArmedToEnclosingWindow?.() === true &&
      engine.pendingPoolDrainDepth > 0 &&
      enclosingResolutionContinues
    ) {
      parkArmedForEnclosingWindow(engine, armed);
      return;
    }
    // The bus still runs: normally it resolves the armed watchers the windows did not reach
    // and any watcher armed while they were resolving. Entry windows opt into the trigger-time
    // snapshot because an inherited effect acquired during engine very play event did not exist
    // when the event happened and cannot retroactively trigger (BT13-013, Q2272).
    //
    // It runs INSIDE the window depth so whatever it fires is recorded as consumed: a play seam
    // publishes its play event twice (engine entry window, then the trailing `whenPlayed` bus that
    // a multi-card play needs), and without that record the second publication fires the same
    // watcher again (BT20-028 Q4321).
    await busFire();
  } finally {
    engine.subTriggerWindowDepth -= 1;
  }
  if (engine.subTriggerWindowDepth === 0 && engine.parkedEntrySubTriggers.length === 0)
    engine.consumedSubTriggerKeys.clear();
}

/**
 * Hand watchers armed by one event to the window that is holding that event's printed
 * effects, so both halves stay simultaneous and the turn player orders them together
 * (CR §15-4). They keep the `occurrence` captured when they were armed, so their shared
 * `[Once Per Turn]` budget stays keyed to their own event rather than to whichever window
 * ends up resolving them. Each is claimed as consumed on the way in: the same event is
 * republished by the play seam's trailing bus, which would otherwise arm a second copy for
 * the same window to resolve (P-098 Q4184).
 */
export function parkArmedForEnclosingWindow(engine: GameEngine, armed: readonly ArmedSubTrigger[]): void {
  const parked = armed.filter((item) => !engine.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)));
  for (const item of parked) engine.consumedSubTriggerKeys.add(subTriggerIdentity(item.sub));
  engine.parkedEntrySubTriggers.push(...parked);
}

/**
 * Is engine armed watcher still activatable RIGHT NOW? A pending trigger whose condition stops
 * being met before it activates can no longer activate (CR §15-4-4-5): two copies of Hina
 * Kurihara EX3-065 both trigger on one digivolution, but if the first one's resolution removes
 * the evolved Digimon, the second has nothing to react to (KB Q3430). Re-checked between
 * resolutions — the SubTrigger bus gets engine for free by evaluating `matches` at fire time.
 */
export function subTriggerStillActivatable(engine: GameEngine, item: ArmedSubTrigger): boolean {
  const ctx = item.contextAtFireTime();
  if (ctx === undefined) return false;
  if (item.sub.matches !== undefined && !item.sub.matches(ctx)) return false;
  // Once-per-turn siblings share only their own event occurrence. If a different occurrence
  // consumed the live ledger, engine item must drop from the ordering prompt; the per-occurrence
  // success set is what distinguishes an allowed same-event sibling from a later event/group.
  const oncePerTurnKey = item.sub.oncePerTurnKey;
  if (
    oncePerTurnKey !== undefined &&
    engine.tracker.count(oncePerTurnKey, "subtrigger") > 0 &&
    !item.occurrence.oncePerTurnSuccessfulKeys.has(oncePerTurnKey)
  )
    return false;
  if (item.sub.hasLegalOutcome !== undefined && !item.sub.hasLegalOutcome(ctx)) return false;
  return item.sub.canFire === undefined || item.sub.canFire(ctx);
}

/** Present a watcher to the ordering prompt as an ordinary collected effect. */
export function subTriggerAsCollected(engine: GameEngine, { sub, ctx }: ArmedSubTrigger): CollectedEffect {
  return {
    source: ctx.source,
    ...(sub.orderedByTurnPlayer === true ? { orderingSeat: engine.state.turnSeat } : {}),
    // The stack resolver re-creates a context for every collected effect. Carry the event
    // snapshot along with engine watcher so placement guards and action filters see the same
    // exact payload that armed it (especially a stack source already moved to trash).
    triggerInfo: ctx.trigger,
    discardedStackSourceProof: ctx.discardedStackSourceProof,
    timingLabel: sub.event,
    printedTiming: sub.printedTiming,
    effect: {
      effectKey: subTriggerEffectKey(sub),
      description: sub.printedClause ?? sub.description,
      optional: false,
      isInherited: sub.isInheritedSource === true,
      isSecurity: false,
      isLinked: sub.isLinkedSource === true,
      maxPerTurn: -1,
      canTrigger: () => true,
      canActivate: () => true,
      resolve: sub.run,
    },
  };
}

/**
 * Announce a watcher body as it starts, the way the effect stack announces the printed
 * effects it resolves (`resolutionDeps.onResolving`). A watcher IS a triggered effect: it can
 * stop the game to ask its controller for a choice, and the players are owed the clause that
 * asked before the wait — a security-removal reaction ("when your opponent's security stack is
 * removed from") activates mid-check, so without engine the board simply froze on the check with
 * nothing said. Watchers folded into a timing window are announced by the resolver instead, so
 * that path passes no announcer and neither announces twice.
 */
export function announceSubTrigger(
  engine: GameEngine,
  sub: SubTriggerSubscription,
  ctx: EffectContext | undefined,
): void | (() => void) {
  if (ctx === undefined) return;
  const effectKey = subTriggerEffectKey(sub);
  const announcementKey = `${engine.state.turnCount}:${effectKey}`;
  if (sub.oncePerTurnKey !== undefined && engine.announcedSubTriggerEffectKeys.has(announcementKey)) return;
  if (sub.oncePerTurnKey !== undefined) engine.announcedSubTriggerEffectKeys.add(announcementKey);
  const description = sub.printedClause ?? subTriggerDescriptionFor(sub, ctx);
  engine.hooks.emit({
    kind: "effectTriggered",
    seat: ctx.source.ownerSeat,
    sourceCardId: ctx.source.cardId,
    sourceInstanceId: ctx.source.instanceId,
    sourcePermanentId: ctx.source.permanent()?.permanentId,
    effectKey,
    description,
    timing: sub.event,
    ...(sub.printedTiming !== undefined ? { printedTiming: sub.printedTiming } : {}),
    ...(sub.isInheritedSource === true ? { isInherited: true } : {}),
    // `securityChecked` closes the check AFTER these bodies have run, so the client needs
    // engine to hold the announcement until the checked card's reveal has been shown.
    ...(engine.securityCheckDepth > 0 ? { duringSecurityCheck: true } : {}),
  });
  return () =>
    engine.hooks.emit({
      kind: "effectResolved",
      seat: ctx.source.ownerSeat,
      sourceCardId: ctx.source.cardId,
      sourceInstanceId: ctx.source.instanceId,
      sourcePermanentId: ctx.source.permanent()?.permanentId,
      effectKey,
      description,
      timing: sub.event,
      ...(sub.isInheritedSource === true ? { isInherited: true } : {}),
    });
}

/**
 * Keep a printed [Once Per Turn] watcher's resolver identity stable across
 * continuous recomputes. Registry ids are intentionally ephemeral; using one
 * there makes the same pending occurrence look new after a nested evolution.
 */
function subTriggerEffectKey(sub: SubTriggerSubscription): string {
  if (sub.oncePerTurnKey === undefined) return `subtrigger/${sub.id}/${sub.description}`;
  return `subtrigger/opt/${sub.oncePerTurnKey}/${sub.dedupeKey ?? sub.description}`;
}

/**
 * Run one armed watcher. `contextAtFireTime` decides which board it sees: the immediate path
 * rebuilds the context now (so `fireSnapshot`'s own `matches` re-check can still drop a watcher
 * whose condition lapsed), while the deferred paths hand back the context bound when their
 * event happened, because their trigger has already activated (KB Q2611/Q2629).
 */
export async function fireOneSubTrigger(
  engine: GameEngine,
  { sub, contextAtFireTime, occurrence }: ArmedSubTrigger,
  opts: {
    announce?: boolean;
    drainCurrentTimingWindow?: () => Promise<void>;
  } = {},
): Promise<void> {
  if (engine.subTriggerWindowDepth > 0) engine.consumedSubTriggerKeys.add(subTriggerIdentity(sub));
  const drainCurrentTimingWindow = opts.drainCurrentTimingWindow;
  await engine.subTriggers.fireSnapshot(
    [sub],
    () => {
      const ctx = contextAtFireTime();
      if (ctx !== undefined && drainCurrentTimingWindow !== undefined) {
        ctx.drainCurrentTimingWindow = drainCurrentTimingWindow;
      }
      return ctx;
    },
    engine.activeWindowToken,
    subTriggerTurnLedger(engine),
    undefined,
    opts.announce === false ? undefined : (fired, ctx) => announceSubTrigger(engine, fired, ctx),
    occurrence.oncePerTurnSnapshotKeys,
    occurrence.oncePerTurnSuccessfulKeys,
  );
}

/**
 * Anchor a watcher's context on its OWN source permanent (so its body's "engine Digimon" and
 * controller scope resolve correctly) with the event `payload` in `ctx.trigger`. Preserves the
 * exact card that installed the watcher: for an inherited effect whose source card is later
 * trashed from the host's stack, the body still means "engine card", not the host's current top
 * card. Returns undefined — skipping the watcher — when its anchor has left the field (the
 * subscription should already have been dropped on leave; guard defensively) or when the
 * breeding-area rule hides the event's subject from it.
 */
export function buildSubTriggerContext(
  engine: GameEngine,
  sub: SubTriggerSubscription,
  payload: TriggerInfo,
): EffectContext | undefined {
  const context = buildSubTriggerSourceContext(engine, sub, payload);
  if (context === undefined) return undefined;
  return breedingHidesSubjectFrom(engine, sub.event, payload, context.source) ? undefined : context;
}

/**
 * Preserve the placement proof for an inherited source that was just discarded from a live
 * host. The normal inherited placement guard intentionally rejects an off-field source; these
 * three discard events are the only seams that carry an exact stack-card identity after the
 * move. Enrich only the bound context (never the shared payload) and require the card to be in
 * trash and the event subject to be the anchored host, so a returned/unrelated card cannot be
 * resurrected as an inherited effect.
 */
export function discardedStackSourceContextPayload(
  engine: GameEngine,
  sub: SubTriggerSubscription,
  payload: TriggerInfo,
): { payload: TriggerInfo; proof: DiscardedStackSourceProof } | undefined {
  const sourceInstanceId = sub.sourceInstanceId;
  if (sourceInstanceId === undefined) return undefined;
  if (
    sub.event !== "onDigiBurstCardDiscarded" &&
    sub.event !== "onDigivolutionCardsDiscardedBatch" &&
    sub.event !== "onDigivolutionCardDiscarded"
  )
    return undefined;
  if (payload.subjectPermanentId === undefined) return undefined;
  if (engine.access.permanentById(payload.subjectPermanentId) === undefined) return undefined;
  if (sub.sourcePermanentId !== undefined && payload.subjectPermanentId !== sub.sourcePermanentId) return undefined;
  const listed =
    sub.event === "onDigivolutionCardDiscarded"
      ? payload.trashedDigivolutionInstanceId === sourceInstanceId
      : (payload.trashedDigivolutionInstanceIds ?? []).includes(sourceInstanceId);
  if (!listed || rootZoneOfLooseInstance(engine.state, sourceInstanceId) !== "trash") return undefined;
  return {
    payload,
    proof: { sourceInstanceId, hostPermanentId: payload.subjectPermanentId },
  };
}

export function buildSubTriggerSourceContext(
  engine: GameEngine,
  sub: SubTriggerSubscription,
  payload: TriggerInfo,
): EffectContext | undefined {
  if (sub.sourcePermanentId !== undefined) {
    const srcPerm = engine.access.permanentById(sub.sourcePermanentId);
    if (srcPerm?.topCard === undefined) return undefined;
    const sourceInstance = [srcPerm.topCard, ...srcPerm.stack, ...srcPerm.linked].find(
      (card) => card.instanceId === sub.sourceInstanceId,
    );
    if (sub.sourceInstanceId !== undefined && sourceInstance === undefined) {
      // A stack-card watcher can retain the host as its lifecycle anchor while its printed
      // source has just moved to trash. Rebind only to the exact card named by engine discard
      // event; a generic loose-zone lookup here would resurrect unrelated/returned cards.
      const discarded = discardedStackSourceContextPayload(engine, sub, payload);
      if (discarded === undefined) return undefined;
      const discardedSource = findLooseInstance(engine, sub.sourceInstanceId);
      if (discardedSource === undefined) return undefined;
      const context = buildEffectContext(engine, cardSourceOf(engine, discardedSource), discarded.payload);
      context.discardedStackSourceProof = discarded.proof;
      return context;
    }
    return buildEffectContext(engine, cardSourceOf(engine, sourceInstance ?? srcPerm.topCard), payload);
  }
  if (sub.sourceInstanceId !== undefined) {
    // `findLooseInstance` searches EVERY zone, so the zone recorded at install time is the
    // only thing keeping a trash/hand/security watcher from firing after its card moved
    // (CR §15-4-4-3; KB Q2671, Q2805). Checked before the lookup so a security card flipped
    // face-down — which `findLooseInstance` simply stops seeing — still latches as departed.
    // A hand-resident watcher for "when engine card is trashed from your hand" activates
    // because its source JUST moved from hand to trash. Preserve that one event's source
    // through context construction; every later event still observes the departed hand
    // root and drops the watcher normally.
    const activatesFromItsOwnHandTrash =
      sub.event === "whenTrashedFromHand" && payload.trashedFromHandInstanceId === sub.sourceInstanceId;
    if (!activatesFromItsOwnHandTrash && looseSourceLeftInstallZone(engine, sub, sub.sourceInstanceId))
      return undefined;
    const loose = findLooseInstance(engine, sub.sourceInstanceId);
    if (loose === undefined) return undefined;
    const discarded = discardedStackSourceContextPayload(engine, sub, payload);
    const context = buildEffectContext(engine, cardSourceOf(engine, loose), discarded?.payload ?? payload);
    if (discarded !== undefined) context.discardedStackSourceProof = discarded.proof;
    return context;
  }
  if (sub.activationContext !== undefined) {
    return {
      ...sub.activationContext,
      trigger: payload,
      selections: new Map(),
    };
  }
  return undefined;
}

/**
 * Has engine loose-anchored watcher's source card left the root zone it was installed from?
 * CR §15-4-4-3 (KB Q2671, Q2805): the card must still be in the trash, still in the hand, or
 * still in security AND face-up — otherwise the pending effect can no longer activate.
 *
 * Only a zone-resident watcher carries a recorded zone (see `SubTriggerSubscription`'s
 * `sourceRootZone`); everything else is never dropped by engine check — an already-activated
 * effect's one-shot consequence (Q1495), a source in no nameable zone (§9-1-4), and a
 * permanent-anchored watcher, whose lifecycle `dropPermanent` already owns.
 *
 * Departure LATCHES: once observed, the watcher stays dead even if the card returns, so a
 * trash -> hand -> trash round trip inside one window cannot revive it (§15-4-4-3) — the same
 * one-way semantics as `everCollected`/`departed` in `effects/stack.ts`. Like those sets, engine
 * can only observe moves that happen BETWEEN context builds: a move made and undone inside a
 * single effect body is invisible to it (see the note in `stack.test.ts`).
 */
export function looseSourceLeftInstallZone(
  engine: GameEngine,
  sub: SubTriggerSubscription,
  sourceInstanceId: string,
): boolean {
  if (sub.sourceRootZone === undefined) return false;
  if (sub.sourceRootZoneDeparted === true) return true;
  if (rootZoneOfLooseInstance(engine.state, sourceInstanceId) === sub.sourceRootZone) return false;
  sub.sourceRootZoneDeparted = true;
  return true;
}

/**
 * Fire a DEFERRED snapshot: watchers whose event already happened but whose activation waited
 * for the resolving effect (a security removal) or the rule fixpoint to finish. They are still
 * simultaneous triggers of one event, so several of them are ordered by their controller just
 * like an immediate fire.
 */
export async function fireSubTriggerSnapshot(
  engine: GameEngine,
  subscriptions: readonly SubTriggerSubscription[],
  payload: TriggerInfo,
  boundContexts?: ReadonlyMap<number, EffectContext>,
): Promise<void> {
  const armed = armedSubTriggers(engine, subscriptions, payload, boundContexts);
  if (armed.length > 1) {
    await runSubTriggersInChosenOrder(engine, armed);
  } else {
    await engine.subTriggers.fireSnapshot(
      subscriptions,
      (sub) => boundContexts?.get(sub.id) ?? buildSubTriggerContext(engine, sub, payload),
      engine.activeWindowToken,
      subTriggerTurnLedger(engine),
      (sub) => engine.consumedSubTriggerKeys.has(subTriggerIdentity(sub)),
      (sub, ctx) => announceSubTrigger(engine, sub, ctx),
    );
  }
  await engine.recomputeContinuousEffects();
}

/**
 * Comprehensive Rules §3-4-5-6: "Trigger conditions can't be met by cards in breeding areas,
 * except for effects that explicitly specify or reference breeding areas." Its own example is
 * a Tamer's "[Your Turn] When your Digimon digivolves, by suspending engine Tamer, <Draw 1>",
 * which does NOT trigger off a breeding-area digivolution (KB Q870/Q1038; Q4428: only the word
 * "field" spans both areas, "your Digimon" is the battle area alone).
 *
 * The engine still FIRES the digivolve/play/place-under events for a breeding-area subject —
 * a [Breeding] effect on the breeding permanent itself legitimately watches them — so the rule
 * is enforced per WATCHER: one whose source is not itself in the breeding area cannot see a
 * breeding-area subject, and is skipped exactly like a watcher whose source left the field.
 */
export function breedingHidesSubjectFrom(
  engine: GameEngine,
  event: SubTriggerEventName,
  payload: TriggerInfo,
  watcherSource: CardSource,
): boolean {
  if (BREEDING_SUBJECT_EVENTS.has(event)) return false;
  const subjectId = payload.subjectPermanentId;
  if (subjectId === undefined) return false;
  if (engine.access.permanentById(subjectId)?.inBreeding !== true) return false;
  return watcherSource.isOnBreedingArea?.() !== true;
}
