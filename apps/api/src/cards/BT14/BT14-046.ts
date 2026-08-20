import { CardColor, CardKind, EffectTiming, type Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { staticModifier, beforePayCost } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-046 — Togemon (BT14, Green Lv.4 Digimon).
 *
 * Hand-written module: the declarative effect record could not express the BeforePayCost
 * suspend-cost pattern. Phase 14 (HARD-03/HARD-05) unblocks it via the
 * `payActivationCost` primitive.
 *
 *   1. EffectTiming.BeforePayCost (OPT, maxCount 1, suspend green Digimon →
 *        a) CanSelectPermanentCondition1: green unsuspended battle-area Digimon
 *        b) rule implementation.Tap()
 *        c) rule implementation(-3) registered on UntilCalculateFixedCostEffect
 *   2. EffectTiming.None (isInherited, maxCountPerTurn 1, reduce evo cost by 1
 *      if green Tamer on owner's field).
 */

const cardId = "BT14-046";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [Your Turn][Once Per Turn] BeforePayCost: suspend a green Digimon →
    //     reduce the play cost by 3 (HARD-03/HARD-05).
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-suspend-green-digimon`,
          description:
            "[Your Turn][Once Per Turn] When you would play a green Tamer card from your hand, " +
            "by suspending 1 of your green Digimon, reduce the play cost by 3.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const def = ctx.source.definition;
            if (def === undefined) return false;
            const isGreenTamer =
              def.kinds.includes(CardKind.Tamer) && def.colors.includes(CardColor.Green);
            const inHand = ctx.source.permanent() === undefined;
            return isGreenTamer && inHand;
          },
          canActivate: (ctx) => {
            return hasEligibleGreenDigimon(ctx.game, source);
          },
          resolve: async (ctx) => {
            const eligibles = listEligibleGreenDigimon(ctx.game, source);
            if (eligibles.length === 0) return;

            // Optional: player chooses whether to pay the suspend cost.
            const wantToPay = await ctx.ask.optional(
              ctx,
              "Suspend 1 of your green Digimon to reduce the play cost by 3?",
            );
            if (!wantToPay) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligibles.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            // Pay the suspend cost using the explicit-parameter primitive (HARD-05).
            const paid = ctx.fx.payActivationCost?.(chosen[0]!, "suspend");
            if (!paid) return;

            // Register the cost delta — fireBeforePayCost reads it to floor the cost.
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 3;
          },
        }),
      ];
    }

    // (2) [Your Turn][Once Per Turn][Inherited] Digivolution cost −1 if green Tamer.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-evo-cost-reduction-green-tamer`,
          description:
            "[Your Turn][Once Per Turn][Inherited] When this Digimon would digivolve, " +
            "if you have a green Tamer, reduce the digivolution cost by 1.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => hasGreenTamer(ctx.game, source),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.changeEvoCost(
              ({ target }) => target.permanentId === self.permanentId,
              -1,
            );
          },
        }),
      ];
    }

    return [];
  },
};

function hasGreenTamer(game: GameAccess, source: CardSource): boolean {
  const owner = game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const def = game.definitionOf(top);
    if (!def.kinds.includes(CardKind.Tamer)) continue;
    if (def.colors.includes(CardColor.Green)) return true;
  }
  return false;
}

function hasEligibleGreenDigimon(game: GameAccess, source: CardSource): boolean {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.some((p) => isEligible(p, game));
}

function listEligibleGreenDigimon(game: GameAccess, source: CardSource) {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.filter((p) => isEligible(p, game));
}

function isEligible(p: Permanent, game: GameAccess): boolean {
  if (p.inBreeding) return false;
  if (p.isSuspended) return false;
  if (p.topCard === undefined) return false;
  const def = game.definitionOf(p.topCard);
  if (!def.kinds.includes(CardKind.Digimon)) return false;
  if (!def.colors.includes(CardColor.Green)) return false;
  return true;
}

registerCard(module);
export default module;
