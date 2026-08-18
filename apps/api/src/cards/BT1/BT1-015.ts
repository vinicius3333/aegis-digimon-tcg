import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-015";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/your-turn-dp`,
        description: "[Your Turn] This Digimon gets +2000 DP.",
        isInherited: true,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.modifyDP(self.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
