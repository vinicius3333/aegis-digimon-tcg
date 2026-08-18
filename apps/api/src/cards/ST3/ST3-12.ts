import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-12",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: "ST3-12/security-dp",
          description: "Opponent's turn: your Security Digimon get +2000 DP.",
          when: () => !source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.modifySecurityDp(source.ownerSeat, 2000, { continuous: true });
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST3-12/security",
          description: "Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
