import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-081";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
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
      ];
    if (timing === EffectTiming.OnEndAttack)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/unsuspend`,
          description: "[End of Attack][Twice Per Turn] By losing 3 memory, unsuspend this Digimon.",
          optional: true,
          maxPerTurn: 2,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.gainMemoryForSeat(source.ownerSeat, -3);
            ctx.fx.unsuspend([self.permanentId]);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
