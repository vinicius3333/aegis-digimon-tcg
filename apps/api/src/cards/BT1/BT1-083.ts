import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-083";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/piercing`,
        description: "Piercing",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.grantPierce(self.permanentId, EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/dp`,
        description: "[Your Turn] This Digimon gets +4000 DP.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.modifyDP(self.permanentId, 4000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
