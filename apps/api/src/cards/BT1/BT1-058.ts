import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-058";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/memory-loan`,
        description: "[When Attacking] Gain 3 memory. At end of turn, lose 3 memory.",
        resolve: async (ctx) => {
          ctx.fx.gainMemoryForSeat(source.ownerSeat, 3);
          ctx.fx.delayedGainMemory?.(source.ownerSeat, -3);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
