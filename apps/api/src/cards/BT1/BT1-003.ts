import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-003";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/draw`,
        description: "[When Attacking][Once Per Turn] Draw 1 if an opposing Digimon has no digivolution cards.",
        isInherited: true,
        maxPerTurn: 1,
        canActivate: (ctx) => {
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          return opponent.battleArea.some(
            (permanent) =>
              permanent.topCard !== undefined &&
              isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
              permanent.stack.length === 0,
          );
        },
        resolve: async (ctx) => {
          await ctx.fx.draw(source.ownerSeat, 1);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
