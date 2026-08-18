import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-055 — Ebonwumon (BT7, Green Lv.6 Digimon).
 *
 *
 * Printed text (no errata):
 *   [When Digivolving] Suspend 1 of your opponent's Digimon. Then, gain 1 memory for
 *   each of your opponent's suspended Digimon.
 *   [Opponent's Turn] All of your opponent's Digimon gain "[Your Turn] You must trash
 *   1 card in your hand to unsuspend this Digimon."
 *
 * KB Q1596-Q1600: must trash 1 card per Digimon unsuspended; applies to all unsuspend
 * methods; each Ebonwumon in play stacks the requirement.
 *
 * The [Opponent's Turn] effect grants an unsuspend cost to each opponent Digimon. This
 * requires engine-level support for per-permanent unsuspend costs (GrantUnsuspendCost).
 * Modeled here as a static modifier that installs the cost gate; the engine's unsuspend
 * path consults the continuous ledger for active unsuspend-cost requirements.
 */
const cardId = "BT7-055";

function opponentDigimonFilter(ctx: EffectContext, source: CardSource) {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const opp = ctx.game.player(opponent);
  return opp.battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Suspend 1 opponent Digimon, then gain memory per suspended opponent Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Suspend 1 of your opponent's Digimon. Then, gain 1 memory for " +
            "each of your opponent's suspended Digimon.",
          optional: false,
          canActivate: (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.length >= 1;
          },
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const candidateIds = opp.battleArea
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);

            if (candidateIds.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates: candidateIds,
              min: 1,
              max: 1,
            });

            if (selected.length > 0) {
              await ctx.fx.suspend(selected);
            }

            // Gain 1 memory per opponent suspended Digimon.
            const suspendedCount = opp.battleArea.filter(
              (p) => p.isSuspended && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            ).length;

            if (suspendedCount >= 1) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn -- credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, suspendedCount);
            }
          },
        }),
      ];
    }

    // [Opponent's Turn] All opponent Digimon gain unsuspend cost: must trash 1 card from hand.
    // This is a continuous static effect. The engine's unsuspend path consults active
    // unsuspend-cost requirements on each Digimon.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/unsuspend-cost`,
          description:
            "[Opponent's Turn] All opponent Digimon gain '[Your Turn] You must trash " +
            "1 card in your hand to unsuspend this Digimon.'",
          optional: false,
          when: (ctx) => source.isOnBattleArea() && !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);

            for (const p of opp.battleArea) {
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (isDigimon(def)) {
                ctx.fx.restrict(
                  p.permanentId,
                  "unsuspendHandTrashCost",
                  EffectDuration.UntilOpponentTurnEnd,
                );
              }
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
