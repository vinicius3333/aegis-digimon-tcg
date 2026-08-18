import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-047";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnStartTurn) return [];
    return [turnTiming({
      source,
      effectKey: `${cardId}/start-turn-draw`,
      description: "[Start of Your Turn] Draw 1.",
      resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
    })];
  },
};
registerCard(module);
export default module;
