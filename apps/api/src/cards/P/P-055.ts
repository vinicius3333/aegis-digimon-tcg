import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-055";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] If you have a Tamer in play, suspend 1 of your opponent's Digimon.",
          canActivate: (ctx) =>
            Array.from(ctx.game.player(source.ownerSeat).battleArea).some(
              (permanent) =>
                permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
            ),
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const candidates = opponent.battleArea
              .filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                  !permanent.isSuspended,
              )
              .map((permanent) => permanent.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) await ctx.fx.suspend(chosen);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnBattleDeleteOpponent) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/battle-delete-memory`,
          description:
            "[Your Turn] When this Digimon deletes an opponent's Digimon in battle and " +
            "survives, gain 1 memory.",
          when: (ctx) => {
            const self = source.permanent();
            return (
              self !== undefined &&
              ctx.game.state.turnSeat === source.ownerSeat &&
              ctx.trigger.attackerPermanentId === self.permanentId &&
              ctx.game.permanentById(self.permanentId) !== undefined
            );
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
