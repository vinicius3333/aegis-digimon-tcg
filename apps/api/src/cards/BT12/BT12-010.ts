import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-010";
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving({ source, effectKey: `${cardId}/play-takato`, description: "[When Digivolving] If you have no Takato, play one from hand for free.", optional: true, canActivate: (ctx) => !ctx.game.player(source.ownerSeat).battleArea.some((p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn.includes("Takato Matsuki")) && ctx.game.player(source.ownerSeat).hand.some((card) => isTamer(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).nameEn.includes("Takato Matsuki")), resolve: async (ctx) => { const cards = ctx.game.player(source.ownerSeat).hand.filter((card) => isTamer(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).nameEn.includes("Takato Matsuki")); const chosen = await ctx.ask.selectCards(ctx, { candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: cards.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false }); } })];
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/inherited-name-dp`, description: "[Your Turn] Growlmon/Gallantmon host gets +2000 DP.", isInherited: true, when: (ctx) => { const top = source.permanent()?.topCard; if (top === undefined || !source.isOwnersTurn()) return false; const name = ctx.game.definitionOf(top).nameEn; return name.includes("Growlmon") || name.includes("Gallantmon"); }, resolve: async (ctx) => { const host = source.permanent(); if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent); } })];
  return [];
} };
registerCard(module);
export default module;
