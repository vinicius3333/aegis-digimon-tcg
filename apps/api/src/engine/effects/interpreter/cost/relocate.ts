import type { EffectContext } from "../../EffectContext.js";

export async function relocateByEffect(
  ctx: EffectContext,
  destPermanentId: string,
  sourcePermanentId: string,
  opts?: { belowTop?: boolean; shedOwnCards?: boolean; faceUp?: boolean },
): Promise<boolean> {
  // §7-2-2-7 / KB EX2-028, EX2-007, BT11-088: an effect that places a battle-area permanent
  // under another card places ONLY its top card; the permanent's own cards are trashed.
  // Callers opt out with an explicit `shedOwnCards: false`.
  const shedding = { ...opts, shedOwnCards: opts?.shedOwnCards ?? true };
  if (ctx.fx.relocatePermanentByEffect !== undefined) {
    return ctx.fx.relocatePermanentByEffect(destPermanentId, sourcePermanentId, shedding);
  }
  // Minimal unit contexts predate the awaited wrapper. Preserve their recorder behavior;
  // production primitives always expose `relocatePermanentByEffect`.
  return ctx.fx.relocatePermanent(destPermanentId, sourcePermanentId, shedding);
}

/**
 * A whole-clause cost paid by trashing a fixed number of cards the controller picks out of
 * their own hand ("By trashing 1 [TS] trait card from your hand, …").
 *
 * Such a cost is its own question: choosing no card is how a player declines, exactly as
 * the reference client does it, so an optional clause gated only by this cost does not need
 * a separate "use this effect?" step in front of the selection. See `stack.ts:resolveOne`.
 */
