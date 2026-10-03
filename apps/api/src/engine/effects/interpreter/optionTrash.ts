import { CardKind, type Permanent } from "@aegis/shared";
import type { EffectContext } from "../EffectContext.js";

/**
 * An Option card in the battle area. A DUAL card on the field is a Digimon unless an effect
 * placed it there as an Option (CR 4-6-3; KB Q6436). Reads the definition through the effect
 * context, like the rest of the interpreter.
 */
export function isOptionPermanent(ctx: EffectContext, permanent: Permanent): boolean {
  const kinds = ctx.game.definitionOf(permanent.topCard).kinds;
  return kinds.includes(CardKind.Option) && (!kinds.includes(CardKind.Digimon) || permanent.placedByEffect);
}

/**
 * Trash Option permanents from the battle area. Trashing is not deletion (CR 4-16-3), so this
 * goes through the trash verb: no deletion windows, no "can't be deleted" gate, and no
 * `deletedPermanents` narration. Returns how many of the Options left the battle area.
 */
export async function trashOptionPermanents(ctx: EffectContext, options: readonly Permanent[]): Promise<number> {
  if (options.length === 0) return 0;
  const topInstanceIds = options.map((option) => option.topCard.instanceId);
  const trashed = await ctx.fx.trash(topInstanceIds, { byEffectSeat: ctx.source.ownerSeat });
  return trashed.filter(({ instanceId }) => topInstanceIds.includes(instanceId)).length;
}

/** Pay ＜Delay＞'s cost by trashing its source from the battle area (CR 16-17-1). */
export async function trashDelaySource(ctx: EffectContext, source: Permanent): Promise<number> {
  if (isOptionPermanent(ctx, source)) return trashOptionPermanents(ctx, [source]);
  // Every printed ＜Delay＞ source is an Option. The engine has no effect-trash verb for a
  // non-Option permanent, so a hypothetical one keeps the deletion path.
  return ctx.fx.deletePermanent([source.permanentId]);
}
