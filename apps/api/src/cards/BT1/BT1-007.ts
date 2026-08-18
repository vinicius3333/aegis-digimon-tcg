import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-007";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/digivolved-this-turn-dp`,
        description: "[When Attacking] If you digivolved this turn, this Digimon gets +1000 DP for the turn.",
        optional: false,
        isInherited: true,
        canActivate: (ctx) => ctx.game.digivolvedThisTurn?.(source.ownerSeat) ?? false,
        resolve: async (ctx) => {
          const host = ctx.source.permanent();
          if (host !== undefined) {
            ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
          }
        },
      }),
    ];
  },
};

registerCard(module);
