import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import { isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT3-040";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      // [Your Turn] Treated as blue (documented behavior rule implementation appending CardColor.Blue,
      // gated on IsExistOnBattleArea && IsOwnerTurn).
      //
      staticModifier({
        source,
        effectKey: `${cardId}/treated-as-blue`,
        description: "[Your Turn] Treated as blue.",
        optional: false,
        when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          // EXECUTABLE (static-continuous-effects, LOCKED Q4): record a continuous Blue
          // color grant on this permanent. Its effective color set becomes Yellow ∪ Blue, so
          // a "Blue, Level 5" digivolution requirement is satisfied (Q1075). The grant is
          // re-derived every continuous-recompute pass behind the [Your Turn] guard, so it
          // lapses on the opponent's turn (Q1076: it isn't treated as blue then) and when the
          const self = ctx.source.permanent();
          if (self !== undefined) {
            ctx.fx.addColorGrant(self.permanentId, CardColor.Blue, EffectDuration.UntilOwnerTurnEnd);
          }
        },
      }),

      // [Opponent's Turn] Opponent's Digimon with no digivolution cards gain
      // PermanentCondition = opponent battle-area Digimon && HasNoDigivolutionCards,
      // gated on IsExistOnBattleArea && IsOpponentTurn).
      //
      // EXECUTABLE: grantKeyword records a continuous ＜Security Attack -1＞ on each
      // matching permanent. Re-derived every recompute pass, so Q1077's dynamic gate
      // holds (a Digimon that gains a digivolution card no longer matches next pass and
      // the grant is not re-recorded).
      staticModifier({
        source,
        effectKey: `${cardId}/opponent-no-evo-security-attack-minus-1`,
        description:
          "[Opponent's Turn] Opponent's Digimon with no digivolution cards gain " +
          "＜Security Attack -1＞.",
        optional: false,
        when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          for (const permanent of eligibleOpponentDigimon(ctx.game, source)) {
            ctx.fx.grantKeyword(
              permanent.permanentId,
              "SecurityAttack",
              EffectDuration.UntilOpponentTurnEnd,
              -1,
            );
          }
        },
      }),
    ];
  },
};

/**
 * The opponent's battle-area Digimon that currently have NO digivolution cards (documented behavior
 * PermanentCondition: IsPermanentExistsOnOpponentBattleAreaDigimon && HasNoDigivolutionCards).
 * Evaluated fresh each continuous-recompute pass so the grant tracks Q1077's dynamic gate.
 */
function* eligibleOpponentDigimon(game: GameAccess, source: CardSource): Generator<Permanent> {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  const opponent = game.player(opponentSeat);
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const definition: CardDefinition = game.definitionOf(top);
    if (!isDigimon(definition)) continue;
    if (permanent.stack.length > 0) continue; // has digivolution cards -> ineligible (Q1077)
    yield permanent;
  }
}

registerCard(module);
export default module;
