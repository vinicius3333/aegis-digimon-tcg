import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-11",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: "ST2-11/unsuspend",
        maxPerTurn: 1,
        description: "When attacking once per turn, unsuspend this Digimon.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) await ctx.fx.unsuspend([self.permanentId]);
        },
      }),
    ];
  },
};
registerCard(module);
