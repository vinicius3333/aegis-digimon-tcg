import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/draw-on-player-attack`,
        description: "Inherited [When Attacking][Once Per Turn] When this Digimon attacks a player, draw 1.",
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) => {
          const self = source.permanent();
          return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId && ctx.trigger.targetPermanentId === undefined;
        },
        resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
      }),
    ];
  },
};

registerCard(module);
export default module;
