import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-100";
async function reduceDP(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map(({ permanentId }) => permanentId);
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen[0] !== undefined) ctx.fx.modifyDP(chosen[0], -8000, EffectDuration.UntilOpponentTurnEnd);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/yellow-tamer-cost-reduction`,
          description: "When used with a yellow Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Yellow),
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
          description: "[Main] 1 opposing Digimon gets -8000 DP until the end of their turn.",
          resolve: async (ctx) => reduceDP(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => reduceDP(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
