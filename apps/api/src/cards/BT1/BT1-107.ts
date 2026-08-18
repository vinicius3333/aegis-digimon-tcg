import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-107";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const resolve = async (ctx: EffectContext): Promise<void> => {
      await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
    };
    if (timing === EffectTiming.OnUseOption)
      return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Recovery +1.", resolve })];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's Main effect.",
          resolve,
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
