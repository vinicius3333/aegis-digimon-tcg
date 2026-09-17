import type { EffectContext } from "../../EffectContext.js";

export async function relocateByEffect(
  ctx: EffectContext,
  destPermanentId: string,
  sourcePermanentId: string,
  opts?: { belowTop?: boolean; shedOwnCards?: boolean; faceUp?: boolean },
): Promise<boolean> {
  if (ctx.fx.relocatePermanentByEffect !== undefined) {
    return ctx.fx.relocatePermanentByEffect(destPermanentId, sourcePermanentId, opts);
  }
  // Minimal unit contexts predate the awaited wrapper. Preserve their recorder behavior;
  // production primitives always expose `relocatePermanentByEffect`.
  return ctx.fx.relocatePermanent(destPermanentId, sourcePermanentId, opts);
}

/**
 * A whole-clause cost paid by trashing a fixed number of cards the controller picks out of
 * their own hand ("By trashing 1 [TS] trait card from your hand, …").
 *
 * Such a cost is its own question: choosing no card is how a player declines, exactly as
 * the reference client does it, so an optional clause gated only by this cost does not need
 * a separate "use this effect?" step in front of the selection. See `stack.ts:resolveOne`.
 */
