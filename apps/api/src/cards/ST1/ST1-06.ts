import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-06";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "<Blocker>",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
      ];
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-memory`,
          description: "[When Attacking] Lose 2 memory.",
          resolve: async (ctx) => ctx.fx.gainMemory(-2),
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
