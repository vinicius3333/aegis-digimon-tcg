import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-060";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/recovery`,
          description: "[On Play] Recovery +1.",
          resolve: async (ctx) => {
            await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-dp`,
          description: "[Your Turn] This Digimon gets +1000 DP for every 3 security cards.",
          isInherited: true,
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            const units = Math.floor(ctx.game.player(source.ownerSeat).security.length / 3);
            if (self && units > 0) ctx.fx.modifyDP(self.permanentId, units * 1000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
