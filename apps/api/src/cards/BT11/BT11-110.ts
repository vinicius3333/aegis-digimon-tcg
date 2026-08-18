import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-110";

async function deleteTargets(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter((permanent) => {
      if (permanent.isSuspended || permanent.topCard === undefined) return false;
      const definition = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(definition) && (definition.level ?? 99) <= 5;
    })
    .map(({ permanentId }) => permanentId);
  if (candidates.length === 0) return;
  const count = Math.min(3, candidates.length);
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: count, max: count });
  if (chosen.length > 0) await ctx.fx.deletePermanent(chosen, "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/purple-tamer-cost-reduction`,
          description: "When you would use this card, if you have a purple Tamer, reduce the cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Purple),
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
          description: "[Main] Delete 3 of your opponent's unsuspended level 5 or lower Digimon.",
          resolve: async (ctx) => deleteTargets(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => deleteTargets(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
