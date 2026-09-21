import { EffectTiming, type CardInstance } from "@aegis/shared";
import { gatherTriggeredEffects } from "../effects/context.js";
import { permanentIdentityOf } from "../effects/index.js";
import type { CollectedEffect } from "../effects/collect.js";
import type { TriggerInfo } from "../effects/EffectContext.js";
import { fireTiming, resolveDeletionReactions, runTimingWindow } from "./timing.js";
import { armedAsPendingCollected, armedSubTriggers, fireSubTriggerSnapshot } from "./subTriggers.js";
import type { GameEngine } from "../GameEngine.js";
import { effectEnvironment } from "./effectContext.js";

/**
 * Open (or transparently join) a "resolving-effect window" identifying ONE top-level
 * effect resolution for `activeWindowToken` (subsystem: delayed-and-rule-effects, KB
 * Q2814 / BT2-053). Only the OUTERMOST caller mints a fresh token — a call nested
 * inside an already-open window (e.g. `fireTimingForInstance` firing a played
 * permanent's own On Play from within another effect's still-resolving body)
 * transparently reuses the ambient token instead of opening a new one. This is what
 * lets a single effect that plays two same-named Digimon in one go (e.g. Keramon
 * playing 2 Diaboromon Tokens) dedupe an `oncePerTiming` watcher's fire across both
 * plays, while two SEPARATE top-level plays/effects still get distinct tokens and each
 * fires the watcher. Deliberately plain synchronous bookkeeping (not an async wrapper
 * around the caller's body) so it adds no extra microtask tick to the existing
 * `fireTiming`/`fireTimingForInstance` await chains — callers must pair engine with
 * {@link endResolvingWindow} in a `finally`.
 *
 * @returns Whether THIS call minted the token (pass to `endResolvingWindow`).
 */
export function beginResolvingWindow(engine: GameEngine): boolean {
  const isOutermost = engine.activeWindowToken === undefined;
  if (isOutermost) engine.activeWindowToken = ++engine.windowTokenSeq;
  return isOutermost;
}

/**
 * Run one resolution loop, marking that a pool-draining loop is on the stack while it does
 * (see {@link pendingPoolDrainDepth}).
 */
export async function withPendingPoolDrain(
  engine: GameEngine,
  draining: boolean,
  body: () => Promise<void>,
): Promise<void> {
  if (!draining) return body();
  engine.pendingPoolDrainDepth += 1;
  try {
    await body();
  } finally {
    engine.pendingPoolDrainDepth -= 1;
  }
}

/** Close a window opened by `beginResolvingWindow`; a no-op for a non-outermost (nested) call. */
export function endResolvingWindow(engine: GameEngine, wasOutermost: boolean): void {
  if (!wasOutermost) return;
  // An Option can resolve entry-event watchers before its post-use routing finishes while
  // deliberately retaining the played cards' printed [On Play] effects for that later boundary.
  if (engine.optionResolutionDepth === 0) engine.pendingNestedTimingEffects = [];
  engine.pendingWindowSubTriggers = [];
  engine.parkedEntrySubTriggers = [];
  // Claims outlive an inner window when parked watchers are still queued (see
  // `parkArmedForEnclosingWindow`); the queue itself ends here, so the claims do too — but only
  // once no timing window is still folding watchers, since such a window's trailing bus fire
  // relies on the claims its own resolver just recorded.
  if (engine.subTriggerWindowDepth === 0) engine.consumedSubTriggerKeys.clear();
  engine.activeWindowToken = undefined;
}

export async function flushDeferredSecurityRemovalTriggers(engine: GameEngine): Promise<void> {
  if (engine.flushingDeferredSecurityRemovalTriggers) return;
  engine.flushingDeferredSecurityRemovalTriggers = true;
  try {
    while (engine.deferredSecurityRemovalTriggers.length > 0) {
      const deferred = engine.deferredSecurityRemovalTriggers.shift();
      if (deferred !== undefined) {
        await fireSubTriggerSnapshot(engine, deferred.subscriptions, deferred.payload, deferred.contexts);
      }
    }
  } finally {
    engine.flushingDeferredSecurityRemovalTriggers = false;
  }
}

/** Fold an effect-attack cost's security-removal reactions into its [When Attacking] pool. */
export function parkDeferredSecurityRemovalTriggersForAttack(engine: GameEngine): void {
  while (engine.deferredSecurityRemovalTriggers.length > 0) {
    const deferred = engine.deferredSecurityRemovalTriggers.shift();
    if (deferred === undefined) continue;
    const armed = armedSubTriggers(engine, deferred.subscriptions, deferred.payload, deferred.contexts);
    const collected = armedAsPendingCollected(engine, armed);
    for (const entry of collected) {
      engine.nestedTriggerSourceIdentity.set(entry, permanentIdentityOf(entry.source) ?? null);
    }
    engine.pendingNestedTimingEffects.push(...collected);
  }
}

/**
 * Everything that must happen between two effects of one resolution loop, after the rule
 * sweep: drain the windows a resolving effect deferred (an [On Deletion] caused mid-body) and
 * the deferred security-removal reactions. Both were parked precisely because an effect was
 * running; between effects none is, and their triggers must activate BEFORE the effects that
 * were already pending (CR §15-4-5-2/3, KB Q3430).
 */
export async function settleBetweenEffects(engine: GameEngine): Promise<void> {
  await flushDeferredTimingWindows(engine);
  await flushDeferredSecurityRemovalTriggers(engine);
}

export async function flushDeferredTimingWindows(engine: GameEngine): Promise<void> {
  if (engine.flushingDeferredTimingWindows) return;
  // Deferred windows belong between effect bodies. A nested entry seam can reach engine
  // helper while its enclosing card body is still resolving; keep that queue parked until
  // the genuine between-effects boundary.
  if (engine.effectResolutionDepth > 0) return;
  engine.flushingDeferredTimingWindows = true;
  try {
    while (engine.deferredTimingWindows.length > 0) {
      const deferred = engine.deferredTimingWindows.shift();
      if (deferred !== undefined) {
        if (deferred.ascensionCandidates !== undefined) {
          await resolveDeletionReactions(
            engine,
            deferred.trigger,
            deferred.ascensionCandidates,
            (trigger) =>
              runTimingWindow(
                engine,
                deferred.timing,
                trigger,
                deferred.transientCandidates,
                armedAsPendingCollected(engine, deferred.deletionSubTriggers ?? []),
              ),
            deferred.transientCandidates,
            true,
            deferred.deletionSubTriggers,
          );
        } else {
          await fireTiming(engine, deferred.timing, deferred.trigger, deferred.transientCandidates);
        }
      }
    }
  } finally {
    engine.flushingDeferredTimingWindows = false;
  }
}

export function shouldDeferNestedTiming(engine: GameEngine): boolean {
  return engine.effectResolutionDepth > 0 && engine.activeWindowToken !== undefined;
}

export function collectNestedTimingEffects(
  engine: GameEngine,
  timing: EffectTiming,
  trigger: TriggerInfo,
  candidateInstances: readonly CardInstance[],
): CollectedEffect[] {
  const capturedTrigger = { ...trigger };
  return gatherTriggeredEffects(effectEnvironment(engine, capturedTrigger), timing, candidateInstances).map(
    (collected) => ({ ...collected, timing, triggerInfo: capturedTrigger }),
  );
}

export function deferNestedTimingEffects(
  engine: GameEngine,
  timing: EffectTiming,
  trigger: TriggerInfo,
  candidateInstances: readonly CardInstance[],
): void {
  const collected = collectNestedTimingEffects(engine, timing, trigger, candidateInstances);
  for (const entry of collected) {
    engine.nestedTriggerSourceIdentity.set(entry, permanentIdentityOf(entry.source) ?? null);
  }
  engine.pendingNestedTimingEffects.push(...collected);
}

/**
 * Run a TRIGGERED effect body outside the continuous tier.
 *
 * A triggered, duration-scoped effect is never a continuous one (Comprehensive Rules
 * §15-8-2: persistent effects are the ones "constantly activated without being
 * triggered"), so nothing it records may carry the `continuous` tag. This holds even
 * when the body was reached FROM a recompute — a watcher discovered while the engine was
 * re-deriving statics (BT8-081's inherited Digi-Burst reaction) — and when a recompute
 * starts elsewhere while the body is mid-await.
 */
export function withTriggeredMutations<T>(engine: GameEngine, body: () => Promise<T>): Promise<T> {
  return engine.continuousScope.run(false, body);
}

/** Whether what is being recorded right here belongs to the continuous tier. */
export function inContinuousPass(engine: GameEngine): boolean {
  // No store means engine code is not on a continuous-recompute chain, and it must NOT fall
  // back to a shared "a recompute is running somewhere" flag: a triggered body interleaving
  // with an in-flight recompute would tag its one-shot modifiers `continuous`, and the next
  // recompute would erase them (EX13-060's re-run [When Digivolving] -8000 vanished whenever
  // a Tamer play woke its watcher while the play's own recompute was still in flight).
  return engine.continuousScope.getStore() ?? false;
}
