import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-049";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnStartTurn) return [];
    return [turnTiming({
      source,
      effectKey: `${cardId}/start-turn-memory`,
      description: "[Start of Your Turn] Gain 1 memory.",
      resolve: async (ctx) => { ctx.fx.gainMemory(1); },
    })];
  },
};
registerCard(module);
export default module;
