import { isDigimon, isTamer, type CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";

export function hasSaveText(definition: CardDefinition): boolean {
  return `${definition.effectText ?? ""} ${definition.inheritedEffectText ?? ""}`.includes("＜Save＞");
}
export function tamerIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard))).map(({ permanentId }) => permanentId);
}
export async function saveSelf(ctx: EffectContext, source: CardSource): Promise<void> {
  const tamers = tamerIds(ctx, source);
  if (!tamers.length) return;
  const [tamer] = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 0, max: 1 });
  if (tamer) await ctx.fx.placeUnder(tamer, [source.instanceId]);
}
export function saveDigimonInTrash(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game.player(source.ownerSeat).trash.filter((card) => isDigimon(ctx.game.definitionOf(card)) && hasSaveText(ctx.game.definitionOf(card))).map(({ instanceId }) => instanceId);
}
export async function drawIfHostHasSave(ctx: EffectContext, source: CardSource): Promise<void> {
  const host = source.permanent();
  if (host?.topCard !== undefined && hasSaveText(ctx.game.definitionOf(host.topCard))) await ctx.fx.draw(source.ownerSeat, 1);
}
