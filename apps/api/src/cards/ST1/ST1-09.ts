import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenBlocked } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-09";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnBlockAnyone) return [];
    return [
      whenBlocked({
        source,
        effectKey: `${cardId}/inherited-memory`,
        description: "[When Blocked] Gain 3 memory.",
        isInherited: true,
        resolve: async (ctx) => ctx.fx.gainMemory(3),
      }),
    ];
  },
};
registerCard(module);
export default module;
