import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-114";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "Security Attack +2",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 2);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-dp`,
          description: "[Your Turn] This Digimon gets +3000 DP.",
          isInherited: true,
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-cost`,
          description: "[When Attacking] Lose 5 memory.",
          resolve: async (ctx) => {
            ctx.fx.gainMemoryForSeat(source.ownerSeat, -5);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
