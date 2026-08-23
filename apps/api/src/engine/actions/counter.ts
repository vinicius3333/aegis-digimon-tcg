import { EffectTiming, type CardInstance, type Permanent, type Seat, type RejectReason } from "@aegis/shared";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";
import type { EffectContext } from "../effects/EffectContext.js";
import { effectsOf } from "../effects/collect.js";
import { UseTracker, canTrigger, canActivate } from "../effects/kernel.js";
import type { CombatController } from "../combat/controller.js";

/**
 * The `respondCounter` player verb (subsystem: attack-and-block; Comprehensive
 * Rules §11-3 "Counter Timing").
 *
 * §11-3-1: "This is the timing when a non-turn player's [Counter] effect can
 * activate." §11-3-2: "During the counter timing, only 1 [Counter] effect can be
 * activated per attack." The window itself is opened by
 * `CombatController.runCounterWindow` during `resolveAttack`; this module is the
 * matching player-facing verb — mirrors `activateEffect.ts` (validate -> guard ->
 * `effect.resolve(ctx)`), but scoped to the DEFENDING seat and the
 * {@link EffectTiming.OnCounterTiming} window instead of the turn player's
 * OnDeclaration Main-phase window, and gated by the controller's open window /
 * per-attack cap rather than seat-turn/Phase.Main.
 *
 * Passing (both `sourceInstanceId` and `effectKey` omitted) is always legal while
 * the window is open — §11-3-1 says the non-turn player MAY activate a [Counter]
 * effect, not must.
 */

export interface RespondCounterIntent {
  sourceInstanceId?: string;
  effectKey?: string;
}

/**
 * Capabilities the verb needs from the engine, injected so this module does not
 * depend on transport or on the effect-context plumbing's internals. Mirrors
 * {@link import("./activateEffect.js").ActivateEffectDeps} plus the CombatController
 * seam that owns the open window / per-attack cap.
 */
export interface RespondCounterDeps {
  combat: CombatController;
  /** Locate a card instance anywhere on the board (top card / stack / linked). */
  findInstance(instanceId: string): { instance: CardInstance; permanent: Permanent | undefined } | undefined;
  /** Build the CardSource for an instance (engine context plumbing). */
  cardSourceOf(instance: CardInstance): CardSource;
  /** Build the runtime EffectContext for a source + effect (engine context plumbing). */
  makeContext(source: CardSource, effect: Effect): EffectContext;
  /** Per-turn use ledger (engine-owned; shared with the effect stack). */
  tracker: UseTracker;
}

/** The timing window [Counter] effects are keyed under (§11-3 Counter Timing). */
export const COUNTER_TIMING = EffectTiming.OnCounterTiming;

/** Result of validating a respondCounter intent without mutating anything. */
export type RespondCounterCheck =
  | { ok: false; reason: RejectReason }
  | { ok: true; pass: true }
  | { ok: true; pass: false; source: CardSource; effect: Effect; ctx: EffectContext };

/**
 * Validate a respondCounter intent against current state. Pure: mutates nothing
 * (building the EffectContext is read-only).
 */
export function validateRespondCounter(
  seat: Seat,
  intent: RespondCounterIntent,
  deps: RespondCounterDeps,
): RespondCounterCheck {
  // 1. A counter window must be open, and it must be this seat's to answer.
  if (!deps.combat.hasOpenCounterWindow) return { ok: false, reason: "wrong-phase" };
  if (deps.combat.counterWindowSeat !== seat) return { ok: false, reason: "not-your-turn" };

  // Passing is always legal while the window is open.
  if (intent.sourceInstanceId === undefined) return { ok: true, pass: true };
  if (intent.effectKey === undefined) return { ok: false, reason: "illegal-target" };

  // 2. §11-3-2: at most 1 [Counter] effect activated per attack.
  if (deps.combat.counterActivationsRemaining <= 0) return { ok: false, reason: "illegal-target" };

  // 3. The source card must exist on the board and be controlled by this seat.
  const found = deps.findInstance(intent.sourceInstanceId);
  if (found === undefined) return { ok: false, reason: "card-not-in-zone" };
  const controller = found.permanent !== undefined ? found.permanent.controllerSeat : found.instance.ownerSeat;
  if (controller !== seat) return { ok: false, reason: "illegal-target" };

  // 4. The named effect must be one this card contributes at the Counter Timing window.
  const source = deps.cardSourceOf(found.instance);
  const effect = effectsOf(COUNTER_TIMING, source).find((e) => e.effectKey === intent.effectKey);
  if (effect === undefined) return { ok: false, reason: "illegal-target" };

  // 5. The kernel guards must pass (trigger predicate + per-turn limit, then the
  //    activation predicate + inherited/linked placement guard).
  const ctx = deps.makeContext(source, effect);
  if (!canTrigger(effect, ctx, deps.tracker)) return { ok: false, reason: "illegal-target" };
  if (!canActivate(effect, ctx, deps.tracker)) return { ok: false, reason: "illegal-target" };

  return { ok: true, pass: false, source, effect, ctx };
}

/** What applyRespondCounter produced (for the caller / tests / event log). */
export type RespondCounterOutcome =
  | { pass: true }
  | { pass: false; sourceCardId: string; effectKey: string; description: string };

/**
 * Validate then run a respondCounter verb. A pass closes the window immediately;
 * an activation resolves the chosen [Counter] effect and THEN closes the window
 * (registering the §11-3-2 per-attack cap) — mirroring `applyActivateEffect`'s
 * resolve-then-register order.
 */
export async function applyRespondCounter(
  seat: Seat,
  intent: RespondCounterIntent,
  deps: RespondCounterDeps,
): Promise<{ ok: false; reason: RejectReason } | { ok: true; outcome: RespondCounterOutcome }> {
  const check = validateRespondCounter(seat, intent, deps);
  if (!check.ok) return check;

  if (check.pass) {
    deps.combat.resolveCounterPass(seat);
    return { ok: true, outcome: { pass: true } };
  }

  const { source, effect, ctx } = check;
  await effect.resolve(ctx);
  deps.tracker.register(source.instanceId, effect.effectKey);
  deps.combat.resolveCounterActivated(seat);

  return {
    ok: true,
    outcome: { pass: false, sourceCardId: source.cardId, effectKey: effect.effectKey, description: effect.description },
  };
}
