import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { hasTrait, mill } from "./support.js";

const cardId = "ST14-06";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/mill`,
          description: "[When Digivolving] Trash the top 3 cards of your deck.",
          resolve: (ctx) => mill(ctx, source, 3),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp`,
          description: "[Your Turn] While this Digimon has Wizard or Demon Lord, it gets +2000 DP.",
          isInherited: true,
          when: (ctx) => {
            const host = source.permanent();
            return (
              source.isOwnersTurn() &&
              host?.topCard !== undefined &&
              hasTrait(ctx.game.definitionOf(host.topCard), ["Wizard", "Demon Lord"])
            );
          },
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
