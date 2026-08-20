import { EffectTiming, EffectDuration, CardColor, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-089";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this card without paying its cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    // Static: while this is in play on your turn, your green Digimon digivolve for 1 less.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/green-evo-cost-minus-1`,
          description: "When this Tamer digivolves into a green Digimon, reduce the cost by 1.",
          when: () => source.isOwnersTurn() && source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                const self = source.permanent();
                return self !== undefined && target.permanentId === self.permanentId &&
                  into !== undefined && isDigimon(into) && into.colors.includes(CardColor.Green);
              },
              -1,
              { setFixed: false },
            );
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-piercing`,
          description: "＜Piercing＞",
          isInherited: true,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
