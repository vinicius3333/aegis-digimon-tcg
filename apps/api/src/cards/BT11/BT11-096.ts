import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-096";

async function deleteLowestDP(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponents = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    );
  if (opponents.length === 0) return;
  const dpOf = (permanent: (typeof opponents)[number]) =>
    permanent.currentDP || (permanent.topCard === undefined ? 0 : ctx.game.definitionOf(permanent.topCard).dp);
  const lowest = Math.min(...opponents.map(dpOf));
  const candidates = opponents.filter((permanent) => dpOf(permanent) === lowest).map(({ permanentId }) => permanentId);
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 1) await ctx.fx.deletePermanent(chosen, "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/red-tamer-cost-reduction`,
          description: "When you would use this card, if you have a red Tamer, reduce the cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Red),
              ),
          resolve: async (ctx) =>
            ctx.fx.changePlayCost(
              ({ controllerSeat, def }) =>
                controllerSeat === source.ownerSeat && (def as CardDefinition).cardId === cardId,
              -1,
            ),
        }),
      ];
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Delete 1 of your opponent's Digimon with the lowest DP.",
          resolve: async (ctx) => deleteLowestDP(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => deleteLowestDP(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
