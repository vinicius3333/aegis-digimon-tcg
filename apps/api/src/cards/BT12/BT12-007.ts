import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-007";
async function searchTakato(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 4);
  const takatos = shown.filter((card) => ctx.game.definitionOf(card).nameEn.includes("Takato Matsuki"));
  if (takatos.length > 0) await ctx.fx.returnToHand(takatos.map(({ instanceId }) => instanceId));
  let rest = shown.filter((card) => !takatos.includes(card)).map(({ instanceId }) => instanceId);
  if (rest.length > 1 && ctx.ask.orderCards !== undefined) rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards: shown.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })), destination: "deckBottom" });
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.OnPlay) return [onPlay({ source, effectKey: `${cardId}/search-takato`, description: "[On Play] Reveal 4, add all Takato Matsuki, bottom-deck the rest in any order.", resolve: (ctx) => searchTakato(ctx, source) })];
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/inherited-name-dp`, description: "[Your Turn] Growlmon/Gallantmon host gets +2000 DP.", isInherited: true, when: (ctx) => { const top = source.permanent()?.topCard; if (top === undefined || !source.isOwnersTurn()) return false; const name = ctx.game.definitionOf(top).nameEn; return name.includes("Growlmon") || name.includes("Gallantmon"); }, resolve: async (ctx) => { const host = source.permanent(); if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent); } })];
  return [];
} };
registerCard(module);
export default module;
