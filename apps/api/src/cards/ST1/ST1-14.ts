import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-14";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "Your Security Digimon get +7000 DP until the end of your opponent's next turn.",
          resolve: async (ctx) =>
            ctx.fx.modifySecurityDp(source.ownerSeat, 7000, {
              duration: EffectDuration.UntilOpponentTurnEnd,
            }),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "Your Security Digimon get +7000 DP for the turn.",
          resolve: async (ctx) => ctx.fx.modifySecurityDp(source.ownerSeat, 7000),
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
