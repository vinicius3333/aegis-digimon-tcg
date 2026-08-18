import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-012";
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing !== EffectTiming.OnDestroyedAnyone) return [];
  return [
    onDeletion({ source, effectKey: `${cardId}/play-flamemon`, description: "[On Deletion] Play Flamemon from hand suspended for free.", optional: true, resolve: async (ctx) => { const cards = ctx.game.player(source.ownerSeat).hand.filter((card) => isDigimon(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).nameEn === "Flamemon"); if (cards.length === 0) return; const chosen = await ctx.ask.selectCards(ctx, { candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: cards.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false, suspended: true }); } }),
    onDeletion({ source, effectKey: `${cardId}/inherited-play-takuya`, description: "[On Deletion][Inherited] Play Takuya from hand for free.", isInherited: true, optional: true, resolve: async (ctx) => { const cards = ctx.game.player(source.ownerSeat).hand.filter((card) => isTamer(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).nameEn.includes("Takuya Kanbara")); if (cards.length === 0) return; const chosen = await ctx.ask.selectCards(ctx, { candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: cards.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false }); } }),
  ];
} };
registerCard(module);
export default module;
