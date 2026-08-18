import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-07";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-security-attack`,
        description: "<Security Attack +1>",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.grantKeyword(host.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
