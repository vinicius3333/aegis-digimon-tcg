import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-01";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-dp`,
        description: "[Your Turn] With 4 or more digivolution cards, this Digimon gets +1000 DP.",
        isInherited: true,
        when: () => source.isOwnersTurn() && (source.permanent()?.stack.length ?? 0) >= 4,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
