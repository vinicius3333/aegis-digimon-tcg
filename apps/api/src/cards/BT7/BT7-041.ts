import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-041";

function securityCount(ctx: EffectContext, source: CardSource): number {
  return ctx.game.player(source.ownerSeat).security.length;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Gain 2 memory OR Recovery +1 until 3 in security.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/memory-or-recovery`,
          description:
            "[When Digivolving] If you have 3 or more security cards, gain 2 memory. " +
            "If you have 2 or fewer, you may <Recovery +1 (Deck)> until there are 3 " +
            "cards in your security stack.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const secCount = securityCount(ctx, source);

            if (secCount >= 3) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn -- credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 2);
            } else {
              // Recovery until 3 cards in security (add from deck top)
              const needed = 3 - secCount;
              if (needed >= 1) {
                await ctx.fx.recoverToSecurity(source.ownerSeat, needed);
              }
            }
          },
        }),
      ];
    }

    // [Your Turn] static: SA+1 while security >= 3.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/sa-plus-1-while-security-3`,
          description:
            "[Your Turn] While you have 3 or more security cards, this Digimon gains " +
            "<Security Attack +1>.",
          optional: false,
          when: (ctx) =>
            source.isOnBattleArea() &&
            source.isOwnersTurn() &&
            securityCount(ctx, source) >= 3,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) {
              ctx.fx.grantKeyword(
                self.permanentId,
                "SecurityAttack",
                EffectDuration.UntilOwnerTurnEnd,
                1,
                { continuous: true },
              );
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
