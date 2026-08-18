import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-009";
const hasTrait = (def: { types?: string[]; forms?: string[]; attributes?: string[] }, names: string[]): boolean => {
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return names.some((name) => traits.includes(name));
};
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.OnPlay) return [onPlay({ source, effectKey: `${cardId}/trash-hybrid-draw`, description: "[On Play] By trashing a Hybrid Digimon from hand, draw 2.", optional: true, canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.some((card) => isDigimon(ctx.game.definitionOf(card)) && hasTrait(ctx.game.definitionOf(card), ["Hybrid"])), resolve: async (ctx) => { const candidates = ctx.game.player(source.ownerSeat).hand.filter((card) => isDigimon(ctx.game.definitionOf(card)) && hasTrait(ctx.game.definitionOf(card), ["Hybrid"])); const chosen = await ctx.ask.selectCards(ctx, { candidates: candidates.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: candidates.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length === 0) return; const moved = await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat }); if (moved.length === 1) await ctx.fx.draw(source.ownerSeat, 2); } })];
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/inherited-trait-dp`, description: "[Your Turn] Hybrid/Ten Warriors host gets +2000 DP.", isInherited: true, when: (ctx) => { const top = source.permanent()?.topCard; return source.isOwnersTurn() && top !== undefined && hasTrait(ctx.game.definitionOf(top), ["Hybrid", "Ten Warriors"]); }, resolve: async (ctx) => { const host = source.permanent(); if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent); } })];
  return [];
} };
registerCard(module);
export default module;
