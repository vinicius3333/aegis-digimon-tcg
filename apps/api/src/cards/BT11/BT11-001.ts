import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-001";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [onDeletion({
      source,
      effectKey: `${cardId}/inherited-deletion-draw`,
      description: "[On Deletion] If you have a red Tamer in play, draw 1.",
      isInherited: true,
      canActivate: (ctx) => ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
        if (permanent.topCard === undefined) return false;
        const definition = ctx.game.definitionOf(permanent.topCard);
        return isTamer(definition) && definition.colors.includes(CardColor.Red);
      }),
      resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
    })];
  },
};
registerCard(module);
export default module;
