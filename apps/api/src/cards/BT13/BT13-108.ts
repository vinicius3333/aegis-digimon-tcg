import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT13-108 — Waltz's End (BT13, Black Option).
 *
 *
 *   EffectTiming.OptionSkill (lines 14-233): [Main] Choose 1 of your Digimon; until end
 *     of opponent's turn it gains two effects:
 *     (a) [Opponent's Turn] When this Digimon becomes suspended, delete ALL of your
 *         opponent's Digimon with play cost ≤ this Digimon's play cost.
 *         triggered at OnTappedAnyone, filtering opp Digimon by GetCostItself ≤ maxCost.
 *     (b) [Opponent's Turn] This Digimon isn't affected by your opponent's Option cards.
 *     KB Q2361: immunity applies to [Security] effects of opp Options too.
 *     KB Q2362: the "becomes suspended" effect is a Digimon effect, not an Option effect.
 *   EffectTiming.SecuritySkill (lines 235-290): [Security] Delete 1 of your opponent's
 *     Digimon with the lowest play cost.
 *
 * Both effects are granted until end of opponent's turn (UntilOpponentTurnEnd).
 */
const cardId = "BT13-108";

function ownDigimonPermanentIds(game: GameAccess, source: CardSource): string[] {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon))
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Option effect: grant two effects to a chosen Digimon until opp turn end
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-grant-effects`,
          description:
            "[Main] Until the end of your opponent's turn, 1 of your Digimon gains " +
            "\"[Opponent's Turn] When this Digimon becomes suspended, delete all of your " +
            "opponent's Digimon with a play cost less than or equal to this Digimon's\" " +
            "and \"[Opponent's Turn] This Digimon isn't affected by your opponent's Option cards.\"",
          optional: false,
          canActivate: (ctx) => ownDigimonPermanentIds(ctx.game, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = ownDigimonPermanentIds(ctx.game, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            const targetPermanentId = chosen[0]!;

            // (a) [Opponent's Turn] When this Digimon becomes suspended, delete all opp
            //     Digimon with play cost ≤ this Digimon's play cost
            ctx.fx.subscribeSubTrigger?.({
              event: "whenSuspended",
              sourcePermanentId: targetPermanentId,
              once: false,
              expiresOnTurnEndOf: ctx.game.opponentOf(source.ownerSeat),
              matches: (subCtx) => {
                // Only fires on opponent's turn when the selected Digimon is the one suspended
                const suspId = subCtx.trigger?.suspendedPermanentId;
                if (suspId !== targetPermanentId) return false;
                // [Opponent's Turn] guard: the current turn must be the opponent's turn
                const oppSeat = subCtx.game.opponentOf(source.ownerSeat);
                return subCtx.game.state.turnSeat === oppSeat;
              },
              run: async (subCtx) => {
                const perm = subCtx.game.permanentById(targetPermanentId);
                if (perm === undefined || perm.topCard === undefined) return;
                const permDef = subCtx.game.definitionOf(perm.topCard);
                const maxCost = permDef.playCost ?? 0;
                const oppSeat = subCtx.game.opponentOf(source.ownerSeat);
                const oppPlayer = subCtx.game.player(oppSeat);
                const targets = oppPlayer.battleArea
                  .filter((p) => {
                    if (p.inBreeding || p.topCard === undefined) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    if (!def.kinds.includes(CardKind.Digimon)) return false;
                    return (def.playCost ?? 0) <= maxCost;
                  })
                  .map((p) => p.permanentId);
                if (targets.length > 0) await subCtx.fx.deletePermanent(targets);
              },
              description: `${cardId} grant: [Opponent's Turn] on suspend delete opp Digimon ≤ play cost`,
            });

            // (b) [Opponent's Turn] Not affected by opponent's Option cards
            //
            //     KB Q2361: immunity applies to Security effects of Options too.
            ctx.fx.restrict(
              targetPermanentId,
              "beAffected",
              EffectDuration.UntilOpponentTurnEnd,
              { fromSourceKind: ["Option"] },
            );
          },
        }),
      ];
    }

    // [Security] Delete 1 of your opponent's Digimon with the lowest play cost
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-delete-lowest`,
          description: "[Security] Delete 1 of your opponent's Digimon with the lowest play cost.",
          optional: false,
          canActivate: (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opp).battleArea.some((p) => !p.inBreeding && p.topCard !== undefined && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon));
          },
          resolve: async (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opp);
            const digimon = oppPlayer.battleArea.filter(
              (p) => !p.inBreeding && p.topCard !== undefined && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon),
            );
            if (digimon.length === 0) return;

            // Find lowest play cost
            let minCost = Infinity;
            for (const p of digimon) {
              const cost = ctx.game.definitionOf(p.topCard!).playCost ?? 0;
              if (cost < minCost) minCost = cost;
            }
            const lowestCost = minCost;
            const candidates = digimon
              .filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 0) === lowestCost)
              .map((p) => p.permanentId);

            if (candidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
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
