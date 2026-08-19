import type { EffectTiming } from "@aegis/shared";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import type { EffectContext } from "./EffectContext.js";
import { getEffectModule } from "./registry.js";
import { UseTracker, canActivate, canTrigger } from "./kernel.js";

/** One effect paired with the source that produced it (collection output). */
export interface CollectedEffect {
  source: CardSource;
  effect: Effect;
  /** Internal firing window retained so nested decisions can preserve effect provenance. */
  timing?: EffectTiming;
  /** Host that received this buried card's printed effect through a static conferral. */
  conferredToPermanentId?: string;
}

/**
 * Ask one card's registered EffectModule for the effects it contributes at
 * `timing` for `source`. Returns [] when the card has no module registered
 * (an un-implemented card simply contributes nothing — it does not crash the match).
 */
export function effectsOf(timing: EffectTiming, source: CardSource): Effect[] {
  const module = getEffectModule(source.cardId);
  if (module === undefined) return [];
  return module.effectsForTiming(timing, source);
}

/**
 * Collect every effect that TRIGGERS at `timing` across a set of candidate card
 * sources. This is the framework half of stack resolution (step 1-2 of the
 * effect-stack-resolution outline in stack.ts): for each source, get its effects
 * for the timing, then keep those whose kernel `canTrigger` is true (timing guard
 * + the card's `when` + per-turn limit).
 *
 * Ordering (turn player first), optional prompting, and one-at-a-time resolution
 * belong to effect-stack-resolution and are NOT done here — this function is the
 * pure, deterministic "what is eligible" query the resolver builds on.
 *
 * `makeContext` binds the runtime EffectContext (trigger data, game access,
 * primitives, decision API) for a given effect; the engine supplies it.
 */
export function collectTriggeredEffects(
  timing: EffectTiming,
  sources: readonly CardSource[],
  makeContext: (source: CardSource, effect: Effect) => EffectContext,
  tracker: UseTracker,
): CollectedEffect[] {
  const collected: CollectedEffect[] = [];
  for (const source of sources) {
    for (const effect of effectsOf(timing, source)) {
      const ctx = makeContext(source, effect);
      if (canTrigger(effect, ctx, tracker)) {
        collected.push({ source, effect, timing });
      }
    }
  }
  return collected;
}

/**
 * Collect NAMED custom effects granted onto a permanent (GrantStatic grant:"effects" with
 * to the engine Effects it contributes at `timing`, anchored on the GRANTED permanent's top
 * card (its CardSource). The compiled effect carries the same timing builder's gate as a printed
 * effect (e.g. an [On Deletion] grant fires only when the granted permanent is in the deletion
 * window), so a granted ability resolves through the identical stack as a printed one.
 */
export function collectGrantedCustomEffects(
  timing: EffectTiming,
  grants: readonly { instanceId: string; token: string }[],
  sourceForInstance: (instanceId: string) => CardSource | undefined,
  effectsForGrant: (token: string, source: CardSource) => Effect[],
  makeContext: (source: CardSource, effect: Effect) => EffectContext,
  tracker: UseTracker,
): CollectedEffect[] {
  const collected: CollectedEffect[] = [];
  for (const { instanceId, token } of grants) {
    const source = sourceForInstance(instanceId);
    if (source === undefined) continue;
    for (const effect of effectsForGrant(token, source)) {
      const ctx = makeContext(source, effect);
      if (canTrigger(effect, ctx, tracker)) {
        collected.push({ source, effect, timing });
      }
    }
  }
  return collected;
}

/**
 * Collect effects conferred from digivolution-stack cards onto their owning
 * permanent (GrantStatic grant:"effects").
 */
export function collectConferredEffects(
  timing: EffectTiming,
  conferrals: readonly { targetPermanentId: string; stackInstanceId: string; trigger?: string }[],
  instanceById: (id: string) => CardSource | undefined,
  makeContext: (source: CardSource, effect: Effect, conferredToPermanentId: string) => EffectContext,
  tracker: UseTracker,
): CollectedEffect[] {
  const collected: CollectedEffect[] = [];
  for (const { targetPermanentId, stackInstanceId, trigger } of conferrals) {
    const source = instanceById(stackInstanceId);
    if (source === undefined) continue;
    for (const effect of effectsOf(timing, source)) {
      if (trigger !== undefined && effect.irTrigger !== trigger) continue;
      const ctx = makeContext(source, effect, targetPermanentId);
      if (canTrigger(effect, ctx, tracker) && canActivate(effect, ctx, tracker)) {
        collected.push({ source, effect, timing, conferredToPermanentId: targetPermanentId });
      }
    }
  }
  return collected;
}
