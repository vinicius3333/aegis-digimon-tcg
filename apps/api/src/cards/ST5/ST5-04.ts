import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { attackedWithDigimonThisTurn } from "../../engine/turnActivity.js";
const cardId = "ST5-04";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEndTurn) return [];
    return [
      turnTiming({
        source,
        effectKey: `${cardId}/end-opponent-draw`,
        description: "[End of Opponent's Turn] If they didn't attack with a Digimon, draw 1.",
        isInherited: true,
        when: (ctx) =>
          ctx.game.state.turnSeat !== source.ownerSeat &&
          !attackedWithDigimonThisTurn(ctx.game.state, ctx.game.opponentOf(source.ownerSeat)),
        resolve: async (ctx) => {
          await ctx.fx.draw(source.ownerSeat, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
