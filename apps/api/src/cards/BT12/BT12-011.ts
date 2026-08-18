import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-011";
const hunterNames = ["Taiki Kudo", "Yuu Amano", "Tagiru Akashi"];
const textHasSave = (def: { effectText?: string; inheritedEffectText?: string }): boolean => `${def.effectText ?? ""}${def.inheritedEffectText ?? ""}`.includes("Save");
async function playHunter(ctx: EffectContext, source: CardSource): Promise<void> { const cards = ctx.game.player(source.ownerSeat).hand.filter((card) => isTamer(ctx.game.definitionOf(card)) && hunterNames.some((name) => ctx.game.definitionOf(card).nameEn.includes(name))); if (cards.length === 0) return; const chosen = await ctx.ask.selectCards(ctx, { candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: cards.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false }); }
async function saveThenPlace(ctx: EffectContext, source: CardSource): Promise<void> { const tamers = ctx.game.player(source.ownerSeat).battleArea.filter((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard))).map((p) => p.permanentId); if (tamers.length === 0) return; const [host] = await ctx.ask.selectPermanents(ctx, { candidates: tamers, min: 1, max: 1 }); if (host === undefined) return; const cards = ctx.game.player(source.ownerSeat).trash.filter((card) => isDigimon(ctx.game.definitionOf(card)) && textHasSave(ctx.game.definitionOf(card))); const chosen = await ctx.ask.selectCards(ctx, { candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards: cards.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })) }); if (chosen.length > 0) await ctx.fx.placeUnder(host, chosen, { belowTop: true }); }
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.OnPlay) return [onPlay({ source, effectKey: `${cardId}/on-play-hunter`, description: "[On Play] You may play Taiki, Yuu, or Tagiru from hand for free.", optional: true, resolve: (ctx) => playHunter(ctx, source) })];
  if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving({ source, effectKey: `${cardId}/digivolve-hunter`, description: "[When Digivolving] You may play Taiki, Yuu, or Tagiru from hand for free.", optional: true, resolve: (ctx) => playHunter(ctx, source) })];
  if (timing === EffectTiming.OnDestroyedAnyone) return [onDeletion({ source, effectKey: `${cardId}/save-and-place`, description: "[On Deletion] Save, then place a Save Digimon from trash under a Tamer.", resolve: (ctx) => saveThenPlace(ctx, source) })];
  if (timing === EffectTiming.OnUseAttack) return [whenAttacking({ source, effectKey: `${cardId}/inherited-save-delete`, description: "[When Attacking][Once Per Turn] If the host has Save, delete an opposing 4000 DP or less Digimon.", isInherited: true, maxPerTurn: 1, canActivate: (ctx) => { const top = source.permanent()?.topCard; return top !== undefined && textHasSave(ctx.game.definitionOf(top)); }, resolve: async (ctx) => { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 4000).map((p) => p.permanentId); if (candidates.length === 0) return; const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 }); if (chosen.length > 0) await ctx.fx.deletePermanent(chosen); } })];
  return [];
} };
registerCard(module);
export default module;
