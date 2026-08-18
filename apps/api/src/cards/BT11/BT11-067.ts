import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-067";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/jamming`,
        description: "＜Jamming＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-reboot`,
        description: "Inherited: ＜Reboot＞",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "Reboot", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
