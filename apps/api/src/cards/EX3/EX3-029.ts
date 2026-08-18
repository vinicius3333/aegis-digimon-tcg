import { CardColor, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX3-029";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnPlay) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/search-security`,
        description:
          "[On Play] Search your security, reveal 1 card and add it to your hand. If it is yellow, recover 1. Then, shuffle your security.",
        resolve: async (ctx) => {
          const seat = source.ownerSeat;
          const security = Array.from(ctx.game.player(seat).security);
          if (security.length === 0) return;
          const selected = await ctx.ask.selectCards(ctx, {
            candidates: security.map(({ instanceId }) => instanceId),
            min: 1,
            max: 1,
            visibleCards: security.map(({ instanceId, cardId: visibleCardId }) => ({
              instanceId,
              cardId: visibleCardId,
            })),
          });
          const chosen = security.find(({ instanceId }) => instanceId === selected[0]);
          if (chosen === undefined) return;
          const isYellow = ctx.game.definitionOf(chosen).colors.includes(CardColor.Yellow);
          ctx.fx.revealCard(seat, chosen.cardId, cardId);
          const moved = await ctx.fx.securityToHand(seat, 1, { instanceIds: [chosen.instanceId] });
          if (isYellow && moved.length === 1) {
            await ctx.fx.recoverToSecurity(seat, 1);
          }
          ctx.fx.shuffleSecurity(seat);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
