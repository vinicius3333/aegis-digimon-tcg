import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { mill } from "./support.js";

const cardId = "ST14-05";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/mill`,
          description: "[On Play] Trash the top 2 cards of your deck.",
          resolve: (ctx) => mill(ctx, source, 2),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
