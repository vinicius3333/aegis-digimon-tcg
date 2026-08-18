import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-108";
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponents = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    );
  const deCount = Math.min(3, opponents.length);
  if (deCount > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: opponents.map(({ permanentId }) => permanentId),
      min: deCount,
      max: deCount,
    });
    for (const permanentId of chosen) ctx.fx.deDigivolve(permanentId, 1, { byEffectSeat: source.ownerSeat });
  }
  const deletable = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        ctx.game.definitionOf(permanent.topCard).playCost <= 6,
    )
    .map(({ permanentId }) => permanentId);
  const deleteCount = Math.min(3, deletable.length);
  if (deleteCount === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates: deletable, min: deleteCount, max: deleteCount });
  if (chosen.length > 0) await ctx.fx.deletePermanent(chosen, "byEffect");
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/black-tamer-cost-reduction`,
          description: "When used with a black Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Black),
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
          description: "[Main] De-Digivolve 1 three opposing Digimon, then delete 3 with play cost 6 or less.",
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
