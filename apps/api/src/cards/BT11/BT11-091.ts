import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-091";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-digimon-plus-1000`,
          description: "[Your Turn] All of your Digimon get +1000 DP.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
              if (permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard))) {
                ctx.fx.modifyDP(permanent.permanentId, 1000, EffectDuration.Permanent);
              }
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/suspend-for-evo-reduction`,
          description:
            "[Your Turn] When a green Digimon digivolves into level 5+, suspend this Tamer to reduce cost by 1.",
          when: () => source.isOwnersTurn() && source.permanent()?.isSuspended === false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.changeEvoCost(
              ({ target, into }) =>
                target.controllerSeat === source.ownerSeat &&
                target.topCard !== undefined &&
                ctx.game.definitionOf(target.topCard).colors.includes(CardColor.Green) &&
                (into?.level ?? 0) >= 5,
              -1,
              {
                once: true,
                onConsume: () => {
                  void ctx.fx.suspend([self.permanentId], { byEffectSeat: source.ownerSeat });
                },
              },
            );
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
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
