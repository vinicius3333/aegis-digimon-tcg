import type { CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";

export function hasTrait(definition: CardDefinition, names: readonly string[]): boolean {
  const traits = [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])];
  return names.some((name) => traits.includes(name));
}
export async function mill(ctx: EffectContext, source: CardSource, count: number): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, count);
  if (!revealed.length) return;
  const ids = revealed.map(({ instanceId }) => instanceId);
  await ctx.fx.trash(ids, { byEffectSeat: source.ownerSeat });
  await ctx.fx.fireOnDiscardLibrary(source.ownerSeat, ids);
  for (const card of revealed) {
    await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, source.cardId);
  }
}
