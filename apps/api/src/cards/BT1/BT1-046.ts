import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-046";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/draw`,
        description: "[When Attacking] Draw 1 if you have 4 or fewer cards in hand.",
        canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length <= 4,
        resolve: async (ctx) => {
          await ctx.fx.draw(source.ownerSeat, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
