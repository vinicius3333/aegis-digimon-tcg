import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-099";
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponents = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    );
  const withSources = opponents.filter(({ stack }) => stack.length > 0);
  if (withSources.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: withSources.map(({ permanentId }) => permanentId),
      min: 1,
      max: 1,
    });
    const host = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
    if (host !== undefined) {
      const topThree = host.stack.slice(-3).map(({ instanceId }) => instanceId);
      if (topThree.length > 0)
        await ctx.fx.trashDigivolutionCards(host.permanentId, topThree, {
          byEffectSeat: source.ownerSeat,
          byEffectCardId: cardId,
        });
    }
  }
  const empty = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        permanent.stack.length === 0 &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map(({ permanentId }) => permanentId);
  if (empty.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates: empty, min: 1, max: 1 });
  const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
  if (target?.topCard !== undefined) await ctx.fx.returnToHand([target.topCard.instanceId]);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/blue-tamer-cost-reduction`,
          description: "When used with a blue Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Blue),
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
          description:
            "[Main] Trash top 3 sources of 1 opposing Digimon, then return a source-less opposing Digimon to hand.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
