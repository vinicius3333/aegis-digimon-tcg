import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-12";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/team-dp`,
          description: "[Your Turn] All of your Digimon get +1000 DP.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
              if (permanent.topCard && isDigimon(ctx.game.definitionOf(permanent.topCard)))
                ctx.fx.modifyDP(permanent.permanentId, 1000, EffectDuration.Permanent);
            }
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
