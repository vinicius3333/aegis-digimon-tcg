import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-076";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/retaliation`,
        description: "＜Retaliation＞",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.grantKeyword(host.permanentId, "Retaliation", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
