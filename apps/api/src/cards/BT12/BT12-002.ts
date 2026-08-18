import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-002";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [whenAttacking({
      source,
      effectKey: `${cardId}/inherited-green-draw`,
      description: "[When Attacking][Once Per Turn] If you have a green Digimon, draw 1.",
      isInherited: true,
      maxPerTurn: 1,
      canActivate: (ctx) => ctx.game.player(source.ownerSeat).battleArea.some((permanent) =>
        permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Green)
      ),
      resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
    })];
  },
};
registerCard(module);
export default module;
