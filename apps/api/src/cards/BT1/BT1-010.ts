import { EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-010";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/reveal-tamer`,
        description: "[On Play] Reveal 5 cards, add 1 Tamer, and bottom-deck the rest.",
        resolve: async (ctx) => {
          const revealed = await ctx.fx.reveal(source.ownerSeat, 5);
          const candidates = revealed
            .filter((card) => isTamer(ctx.game.definitionOf(card)))
            .map((card) => card.instanceId);
          const chosen = candidates.length === 0 ? [] : await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
          let rest = revealed.filter((card) => !chosen.includes(card.instanceId)).map((card) => card.instanceId);
          if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
            rest = await ctx.ask.orderCards(ctx, {
              candidates: rest,
              visibleCards: revealed
                .filter((card) => rest.includes(card.instanceId))
                .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              destination: "deckBottom",
            });
          }
          if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
