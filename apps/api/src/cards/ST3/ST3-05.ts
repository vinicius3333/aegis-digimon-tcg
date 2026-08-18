import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-05",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: "ST3-05/inherited-memory",
        description: "Inherited: when attacking with 4+ security, gain 1 memory.",
        isInherited: true,
        when: (ctx) => ctx.game.player(source.ownerSeat).security.length >= 4,
        resolve: async (ctx) => {
          ctx.fx.gainMemory(1);
        },
      }),
    ];
  },
};
registerCard(module);
