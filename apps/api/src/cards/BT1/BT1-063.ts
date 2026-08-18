import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-063";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/recovery`,
          description: "[When Digivolving] Recovery +1.",
          resolve: async (ctx) => {
            await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "[Your Turn] With 3 or more security, this Digimon gains Security Attack +1.",
          when: (ctx) => source.isOwnersTurn() && ctx.game.player(source.ownerSeat).security.length >= 3,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
