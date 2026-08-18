import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-07",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: "ST2-07/blocker",
          description: "Blocker.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: "ST2-07/lose-memory",
          description: "When attacking, lose 2 memory.",
          resolve: async (ctx) => {
            ctx.fx.gainMemory(-2);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
