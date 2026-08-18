import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-076";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/memory`,
        description: "[When Attacking] Gain 1 memory if the opponent has 2 suspended Digimon.",
        isInherited: true,
        canActivate: (ctx) =>
          ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (p) => p.isSuspended && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            ).length >= 2,
        resolve: async (ctx) => {
          ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
