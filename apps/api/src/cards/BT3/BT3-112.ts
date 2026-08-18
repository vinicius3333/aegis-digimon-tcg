import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT3-112";

function level6DigivolutionCards(ctx: EffectContext, source: CardSource): CardInstance[] {
  const self = source.permanent();
  if (self === undefined) return [];
  return self.stack.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && definition.level === 6;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/de-digivolve-delete`,
          description:
            "[When Digivolving] De-Digivolve 1 on all opposing Digimon, then delete all with 5000 DP or less.",
          optional: false,
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const opponentDigimonIds = opponent.battleArea
              .filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              )
              .map((permanent) => permanent.permanentId);
            for (const permanentId of opponentDigimonIds) {
              ctx.fx.deDigivolve(permanentId, 1);
            }
            const toDelete = opponent.battleArea
              .filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                  permanent.currentDP <= 5000,
              )
              .map((permanent) => permanent.permanentId);
            if (toDelete.length > 0) await ctx.fx.deletePermanent(toDelete);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-unblockable`,
          description:
            "[When Attacking] Return 1 level 6 digivolution card to hand to make this Digimon unblockable for the turn.",
          optional: true,
          canActivate: (ctx) =>
            source.isOnBattleArea() && level6DigivolutionCards(ctx, source).length > 0,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: level6DigivolutionCards(ctx, source).map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            const selectedId = selected[0];
            if (selectedId === undefined) return;
            await ctx.fx.returnToHand([selectedId]);
            ctx.fx.restrict(
              self.permanentId,
              "cantBeBlocked",
              EffectDuration.UntilEachTurnEnd,
            );
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
