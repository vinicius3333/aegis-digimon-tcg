import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-032";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/jamming`,
        description: "Jamming",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
