import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT3-014";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Change the original DP of 1 of your opponent's level 4 or
    // lower Digimon to 1000 for the turn (Q1056/Q1057 overwrite). The guards (on-field;
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/overwrite-original-dp-1000`,
          description:
            "[When Digivolving] Change the original DP of 1 of your opponent's level 4 " +
            "or lower Digimon to 1000 for the turn.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() && hasEligibleTarget(ctx.game, source),
          resolve: async (ctx) => {
            // Overwrite the chosen opponent Lv.4-or-lower Digimon's original DP to an
            // ABSOLUTE 1000 (Q1056/Q1057): ctx.fx.setBaseDP records a duration-scoped
            // base-DP override that additive modifyDP deltas then sum onto — so a
            // separately applied -1000 lands on 1000 and yields 0 (deletion), NOT a
            // double-counted additive buff. The primitive lands the §15-12-2 / §18-2
            // overwrite semantics; this is NOT the forbidden additive emulation.
            const candidates = eligibleTargetIds(ctx.game, source);
            if (candidates.length === 0) return;
            const [picked] = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (picked !== undefined) {
              ctx.fx.setBaseDP(picked, 1000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // [Your Turn] This card is also treated as yellow (documented behavior rule implementation, gated
    // on IsExistOnBattleArea && IsOwnerTurn).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/treated-as-yellow`,
          description: "[Your Turn] This card is also treated as yellow.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.addColorGrant(self.permanentId, CardColor.Yellow, EffectDuration.UntilOwnerTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Whether the opponent controls at least one battle-area Digimon eligible for the
 * [When Digivolving] effect: level 4 or lower, with a level (documented behavior
 * CanSelectPermanentCondition: opponent battle-area Digimon && Level <= 4 &&
 * TopCard.HasLevel). Read-only; used only as the activation guard.
 */
function hasEligibleTarget(game: GameAccess, source: CardSource): boolean {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  const opponent = game.player(opponentSeat);
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const level = game.definitionOf(top).level;
    if (level === undefined) continue; // no level (Tamer/Egg/unleveled) — ineligible
    if (level <= 4) return true;
  }
  return false;
}

/**
 * The permanentIds of the opponent's battle-area Digimon eligible for the [When
 * Digivolving] effect (level 4 or lower, with a level). Mirrors {@link hasEligibleTarget}
 * but returns the concrete ids for target selection.
 */
function eligibleTargetIds(game: GameAccess, source: CardSource): string[] {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  const opponent = game.player(opponentSeat);
  const ids: string[] = [];
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const level = game.definitionOf(top).level;
    if (level === undefined) continue;
    if (level <= 4) ids.push(permanent.permanentId);
  }
  return ids;
}

registerCard(module);
export default module;
