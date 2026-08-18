import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-052";
async function playTamer(ctx: EffectContext, source: CardSource): Promise<void> {
  const cards = ctx.game.player(source.ownerSeat).hand.filter((card) => {
    const def = ctx.game.definitionOf(card);
    return def.kinds.includes(CardKind.Tamer) && (def.playCost ?? 99) <= 3;
  });
  const chosen = cards.length === 0 ? [] : await ctx.ask.selectCards(ctx, {
    candidates: cards.map(({ instanceId }) => instanceId), min: 1, max: 1,
  });
  if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay) return [onPlay({ source, effectKey: `${cardId}/on-play-tamer`, description: "[On Play] You may play a cost-3-or-less Tamer from hand.", optional: true, resolve: (ctx) => playTamer(ctx, source) })];
    if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving({ source, effectKey: `${cardId}/digivolve-tamer`, description: "[When Digivolving] You may play a cost-3-or-less Tamer from hand.", optional: true, resolve: (ctx) => playTamer(ctx, source) })];
    if (timing === EffectTiming.None) return [staticModifier({
      source, effectKey: `${cardId}/inherited-tamer-dp`, description: "[Your Turn] While you have a Tamer, this Digimon gets +2000 DP.", isInherited: true,
      when: (ctx) => source.isOwnersTurn() && ctx.game.player(source.ownerSeat).battleArea.some((permanent) => permanent.topCard !== undefined && ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Tamer)),
      resolve: async (ctx) => { const host = source.permanent(); if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent); },
    })];
    return [];
  },
};
registerCard(module);
export default module;
