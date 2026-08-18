import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-046";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay) return [onPlay({
      source,
      effectKey: `${cardId}/reveal-tamer`,
      description: "[On Play] Reveal 4, add 1 Tamer, bottom-deck the rest in any order.",
      resolve: async (ctx) => {
        const shown = await ctx.fx.reveal(source.ownerSeat, 4);
        const visibleCards = shown.map(({ instanceId, cardId: shownCardId }) => ({ instanceId, cardId: shownCardId }));
        const candidates = shown.filter((card) => ctx.game.definitionOf(card).kinds.includes(CardKind.Tamer));
        const chosen = candidates.length === 0 ? [] : await ctx.ask.selectCards(ctx, {
          candidates: candidates.map(({ instanceId }) => instanceId), min: 1, max: 1, visibleCards,
        });
        if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
        let rest = shown.filter(({ instanceId }) => !chosen.includes(instanceId)).map(({ instanceId }) => instanceId);
        if (rest.length > 1 && ctx.ask.orderCards) rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards, destination: "deckBottom" });
        if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
      },
    })];
    if (timing === EffectTiming.None) return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-tamer-dp`,
      description: "[Your Turn] While you have a Tamer, this Digimon gets +2000 DP.",
      isInherited: true,
      when: (ctx) => source.isOwnersTurn() && ctx.game.player(source.ownerSeat).battleArea.some((permanent) =>
        permanent.topCard !== undefined && ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Tamer)
      ),
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent);
      },
    })];
    return [];
  },
};
registerCard(module);
export default module;
