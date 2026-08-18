import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-104";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/green-tamer-cost-reduction`,
          description: "When used with a green Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Green),
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
            "[Main] 1 own Digimon gets +5000 DP and Rush; then 1 own Digimon may attack an opposing Digimon.",
          resolve: async (ctx) => {
            const own = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
              );
            if (own.length === 0) return;
            const buffed = await ctx.ask.chooseTargets(ctx, {
              candidates: own.map(({ permanentId }) => permanentId),
              min: 1,
              max: 1,
            });
            if (buffed[0] !== undefined) {
              ctx.fx.modifyDP(buffed[0], 5000, EffectDuration.UntilEachTurnEnd);
              ctx.fx.grantKeyword(buffed[0], "Rush", EffectDuration.UntilEachTurnEnd);
            }
            const attackers = own.filter(({ isSuspended }) => !isSuspended).map(({ permanentId }) => permanentId);
            const defenders = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
              )
              .map(({ permanentId }) => permanentId);
            if (
              attackers.length === 0 ||
              defenders.length === 0 ||
              !(await ctx.ask.optional(ctx, "Attack an opponent's Digimon?"))
            )
              return;
            const attacker = await ctx.ask.chooseTargets(ctx, { candidates: attackers, min: 1, max: 1 });
            const defender = await ctx.ask.chooseTargets(ctx, { candidates: defenders, min: 1, max: 1 });
            if (attacker[0] !== undefined && defender[0] !== undefined)
              await ctx.fx.forceBattle?.(attacker[0], defender[0]);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Add this card to its owner's hand.",
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
