import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST8-05";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/inherited-return-level-3`,
        description:
          "[When Attacking] If you have 8 or more cards in hand, return 1 opposing level 3 Digimon and trash all of its sources.",
        isInherited: true,
        canActivate: (ctx) =>
          source.isOnBattleArea() && ctx.game.player(source.ownerSeat).hand.length >= 8,
        resolve: async (ctx) => {
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          const candidates = Array.from(opponent.battleArea).filter((permanent) => {
            if (permanent.topCard === undefined) return false;
            const definition = ctx.game.definitionOf(permanent.topCard);
            return isDigimon(definition) && definition.level === 3;
          });
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, {
            candidates: candidates.map((permanent) => permanent.permanentId),
            min: 1,
            max: 1,
          });
          const target = candidates.find(
            (permanent) => permanent.permanentId === chosen[0],
          );
          if (target?.topCard === undefined) return;
          const sourceIds = target.stack.map((card) => card.instanceId);
          if (sourceIds.length > 0) {
            await ctx.fx.trashDigivolutionCards(target.permanentId, sourceIds, {
              byEffectSeat: source.ownerSeat,
            });
          }
          await ctx.fx.returnToHand([target.topCard.instanceId]);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
