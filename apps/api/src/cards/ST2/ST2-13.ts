import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-13",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST2-13/main",
          description: "Gain 1 memory.",
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST2-13/security",
          description: "Gain 2 memory.",
          resolve: async (ctx) => {
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
