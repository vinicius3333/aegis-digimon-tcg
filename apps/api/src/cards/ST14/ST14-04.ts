import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST14-04";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
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
      staticModifier({
        source,
        effectKey: `${cardId}/cant-attack-players`,
        description: "[Your Turn] This Digimon can't attack players.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.restrict(self.permanentId, "attackPlayers", EffectDuration.Permanent, { continuous: true });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
