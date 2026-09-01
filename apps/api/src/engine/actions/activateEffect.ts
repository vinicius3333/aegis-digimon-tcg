import {
  EffectTiming,
  Phase,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
  type RejectReason,
} from "@aegis/shared";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";
import type { EffectContext } from "../effects/EffectContext.js";
import { effectsOf } from "../effects/collect.js";
import { UseTracker, canTrigger, canActivate } from "../effects/kernel.js";

/**
 * The `activateEffect` player verb (subsystem: intent-protocol-and-room).
 *
 * Activates a card's explicitly-activated `[Main]` ability. Mirrors the source
 * entry where the turn player taps a card to use its main-timing effect
 * (`ActivateMainOptionSecurityEffect` / the `[Main]` activation path), routed in
 * the documented rules through an RPC and resolved by `the engine.ActivateEffectProcess`. All
 * The client has already named the source instance
 * and the effectKey; the server re-validates and resolves.
 *
 * Activated abilities are surfaced by the `activated(...)` builder under the
 * {@link EffectTiming.OnDeclaration} window (the "declarative effect triggered"
 * timing): the verb collects this source's effects for that window, picks the one
 * whose `effectKey` matches the intent, applies the kernel guards
 * (canTrigger/canActivate, including the per-turn `maxPerTurn` limit), and runs its
 * `resolve(ctx)` — which may `await` player decisions via the injected context.
 *
 * Validation order follows the API-CONTRACT "Intent validation contract"
 * (section 4): game/decision gates -> seat/turn/phase -> legality (source in play,
 * controlled by the sender, effect exists and is activatable). On any failure it
 * returns a stable RejectReason and mutates nothing.
 *
 * The verb resolves a SINGLE named effect. Ordering/sequencing multiple
 * simultaneously-triggered effects is the effect-stack-resolution subsystem; this
 * is the direct, player-initiated activation path.
 */

/** The narrowed intent this action handles (mirrors the @aegis/shared Intent variant). */
export interface ActivateEffectIntent {
  sourceInstanceId: string;
  effectKey: string;
}

/**
 * Capabilities the activation needs from the engine, injected so this module does
 * not depend on transport or on the effect-context plumbing's internals.
 */
export interface ActivateEffectDeps {
  /** Locate a card instance anywhere on the board (top card / stack / linked). */
  findInstance(instanceId: string): { instance: CardInstance; permanent: Permanent | undefined } | undefined;
  /** Build the CardSource for an instance (engine context plumbing). */
  cardSourceOf(instance: CardInstance): CardSource;
  /** Build the runtime EffectContext for a source + effect (engine context plumbing). */
  makeContext(source: CardSource, effect: Effect): EffectContext;
  /** Per-turn use ledger (engine-owned; shared with the effect stack). */
  tracker: UseTracker;
  /** Attribute nested effect-driven events to this direct activation while it resolves. */
  enterEffectResolution?(seat: Seat, sourceKinds?: string[], sourcePermanentId?: string): void;
  leaveEffectResolution?(): void;
}

/** The timing window activated `[Main]` abilities are keyed under. */
export const ACTIVATE_TIMING = EffectTiming.OnDeclaration;

/** Result of locating + guarding an activation without running it. Pure. */
export type ActivateEffectCheck =
  | { ok: false; reason: RejectReason }
  | { ok: true; source: CardSource; effect: Effect; ctx: EffectContext };

/**
 * Validate an activateEffect intent against current state. Pure: mutates nothing
 * (note: building the EffectContext is read-only). Returns the resolved
 * source/effect/context on success so `applyActivateEffect` does not repeat the
 * lookup.
 */
export function validateActivateEffect(
  state: GameState,
  seat: Seat,
  intent: ActivateEffectIntent,
  deps: ActivateEffectDeps,
): ActivateEffectCheck {
  // 1. Game / decision gates, then seat / turn / phase. Activated abilities are a
  //    Main-phase verb of the turn player.
  if (state.gameOver) return { ok: false, reason: "illegal-target" };
  if (state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  if (state.phase !== Phase.Main) return { ok: false, reason: "wrong-phase" };

  // 2. The source card must exist on the board.
  const found = deps.findInstance(intent.sourceInstanceId);
  if (found === undefined) return { ok: false, reason: "card-not-in-zone" };

  // 3. The sender must control the source (a permanent it controls, or — for a
  //    loose card — own it).
  const controller = found.permanent !== undefined ? found.permanent.controllerSeat : found.instance.ownerSeat;
  if (controller !== seat) return { ok: false, reason: "illegal-target" };

  // 4. The named effect must be one this card contributes at the activation window.
  const source = deps.cardSourceOf(found.instance);
  const effect = effectsOf(ACTIVATE_TIMING, source).find((e) => e.effectKey === intent.effectKey);
  if (effect === undefined) return { ok: false, reason: "illegal-target" };

  // 5. The kernel guards must pass (trigger predicate + per-turn limit, then the
  //    activation predicate + inherited/linked placement guard).
  const ctx = deps.makeContext(source, effect);
  if (!canTrigger(effect, ctx, deps.tracker)) return { ok: false, reason: "illegal-target" };
  if (!canActivate(effect, ctx, deps.tracker)) return { ok: false, reason: "illegal-target" };

  return { ok: true, source, effect, ctx };
}

/** What applyActivateEffect produced (for the caller / tests / event log). */
export interface ActivateEffectOutcome {
  sourceCardId: string;
  effectKey: string;
  description: string;
}

/**
 * Validate then run an activated ability. Returns ok synchronously after starting
 * resolution? No — resolution may await player decisions, so callers run this as a
 * continuation (its state mutations sync as Colyseus deltas, any prompt arrives on
 * the decision channel), exactly like the play/digivolve handlers. Registers the
 * use against the per-turn ledger after a successful resolve (source
 * `RegisterUseEffectThisTurn`).
 */
export async function applyActivateEffect(
  state: GameState,
  seat: Seat,
  intent: ActivateEffectIntent,
  deps: ActivateEffectDeps,
): Promise<{ ok: false; reason: RejectReason } | { ok: true; outcome: ActivateEffectOutcome }> {
  const check = validateActivateEffect(state, seat, intent, deps);
  if (!check.ok) return check;

  const { source, effect, ctx } = check;
  const sourceKinds = effect.isLinked ? ["Digimon"] : [...(source.definition.kinds ?? [])];
  ctx.effectSourceKinds = sourceKinds;
  deps.enterEffectResolution?.(source.ownerSeat, sourceKinds, source.permanent()?.permanentId);
  try {
    await effect.resolve(ctx);
  } finally {
    deps.leaveEffectResolution?.();
  }
  deps.tracker.register(source.instanceId, effect.effectKey);

  return {
    ok: true,
    outcome: {
      sourceCardId: source.cardId,
      effectKey: effect.effectKey,
      description: effect.description,
    },
  };
}
