import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenBlocked } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-022";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "Piercing",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.Permanent);
          },
        }),
      ];
    }
    if (timing === EffectTiming.OnBlockAnyone) {
      return [
        whenBlocked({
          source,
          effectKey: `${cardId}/blocked-draw`,
          description: "[When Blocked] Draw 1.",
          isInherited: true,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
