import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-002";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [whenAttacking({
      source,
      effectKey: `${cardId}/inherited-attack-draw`,
      description: "[When Attacking][Once Per Turn] If you have a blue Tamer in play, draw 1.",
      isInherited: true,
      maxPerTurn: 1,
      canActivate: (ctx) => ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
        if (permanent.topCard === undefined) return false;
        const definition = ctx.game.definitionOf(permanent.topCard);
        return isTamer(definition) && definition.colors.includes(CardColor.Blue);
      }),
      resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
    })];
  },
};
registerCard(module);
export default module;
