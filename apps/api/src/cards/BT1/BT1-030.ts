import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-030";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [
      onDeletion({
        source,
        effectKey: `${cardId}/memory`,
        description: "[On Deletion] Gain 1 memory.",
        isInherited: true,
        resolve: async (ctx) => {
          ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
