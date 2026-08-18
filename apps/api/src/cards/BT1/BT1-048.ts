import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-048";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/reveal-yellow-tamers`,
        description: "[On Play] Reveal 4, add all yellow Tamers, and bottom-deck the rest.",
        resolve: async (ctx) => {
          const revealed = await ctx.fx.reveal(source.ownerSeat, 4);
          const selected = revealed
            .filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isTamer(definition) && definition.colors.includes(CardColor.Yellow);
            })
            .map((card) => card.instanceId);
          if (selected.length > 0) await ctx.fx.returnToHand(selected);
          const rest = revealed.filter((card) => !selected.includes(card.instanceId)).map((card) => card.instanceId);
          if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
