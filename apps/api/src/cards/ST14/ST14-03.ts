import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { mill } from "./support.js";

const cardId = "ST14-03";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/mill`,
          description: "[On Play] Trash the top 2 cards of your deck.",
          resolve: (ctx) => mill(ctx, source, 2),
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/draw`,
          description: "[On Deletion] If you have 10 or more cards in trash, draw 1.",
          when: (ctx) => ctx.game.player(source.ownerSeat).trash.length >= 10,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
