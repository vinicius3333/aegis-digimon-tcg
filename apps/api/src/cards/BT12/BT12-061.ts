import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-061";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-reboot`,
        isInherited: true,
        description: "Inherited: ＜Reboot＞",
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.grantKeyword(host.permanentId, "Reboot", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
