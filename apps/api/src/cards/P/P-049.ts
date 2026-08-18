import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenBlocked, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-049";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] If you have a Tamer in play, this Digimon gains " +
            "<Security Attack +1> for the turn.",
          canActivate: (ctx) =>
            Array.from(ctx.game.player(source.ownerSeat).battleArea).some(
              (permanent) =>
                permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
            ),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(
                self.permanentId,
                "SecurityAttack",
                EffectDuration.UntilEachTurnEnd,
                1,
              );
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnBlockAnyone) {
      return [
        whenBlocked({
          source,
          effectKey: `${cardId}/when-blocked`,
          description:
            "[Your Turn][Once Per Turn] When this Digimon is blocked, trash the top card " +
            "of your opponent's security stack.",
          maxPerTurn: 1,
          when: (ctx) => ctx.game.state.turnSeat === source.ownerSeat,
          resolve: async (ctx) => {
            await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, {
              fromTop: true,
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
