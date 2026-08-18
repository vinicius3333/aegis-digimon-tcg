import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-090";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseOption) return [];
    return [
      activated({
        source,
        effectKey: `${cardId}/memory-loan`,
        description: "[Main] Gain 2 memory. At end of turn, lose 2 memory.",
        resolve: async (ctx) => {
          ctx.fx.gainMemoryForSeat(source.ownerSeat, 2);
          ctx.fx.delayedGainMemory?.(source.ownerSeat, -2);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
