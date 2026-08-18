import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-067";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-dp`,
        description: "[All Turns] This Digimon gets +1000 DP.",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
