import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-11";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/security-attack`,
        description: "[Your Turn] Security Attack +1 for every 2 digivolution cards.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          const amount = Math.floor(self.stack.length / 2);
          if (amount) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, amount);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
