import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { canDigivolveOntoWithAlternates, cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-034 — Palmon (BT26, Green Lv.3 Digimon).
 *
 * The committed KB contains Q7007 (2026-08-18): "4 or less memory" includes 4
 * through every position to its right on the controller's side of the gauge.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[TS] trait: Cost 0
 *   [Start of Your Main Phase] If you have 4 or less memory, this Digimon may
 *   digivolve into a Digimon card with the [Vegetation] or [TS] trait in the hand
 *   without paying the cost.
 * Inherited: [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's
 *   Digimon.
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
 *     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
 *     here.
 *
 *   EffectTiming.OnStartMainPhase — "If you have 4 or less memory, this Digimon may
 *     digivolve into a Digimon card with the [Vegetation] or [TS] trait in the hand
 *     without paying the cost." Modeled on BT26-090's memory-threshold `canActivate`
 *     shape (`memoryFor` reads `ctx.game.state.memory` turn-relatively; the `when`
 *     guard already restricts this window to the owner's own turn, so no sign flip
 *     is needed for the owner's own memory) combined with BT16-061's "digivolve into
 *     a hand card without paying the cost" shape: candidates are filtered by trait
 *     only (Vegetation or TS), and `ctx.fx.digivolveFromInstance(self, chosen,
 *     { payCost: false })` both waives the memory cost AND still enforces the target
 *     card's own printed digivolution requirement against this Digimon as the base
 *     (KB Q2649 pattern: "without paying the cost" waives cost, not the requirement).
 *     `optional: true` covers "may".
 *
 *   Inherited EffectTiming.OnUseAttack — "[Once Per Turn] You may suspend 1 of your
 *     opponent's Digimon." The candidate list contains only unsuspended battle-area
 *     Digimon because suspension must change the target's state.
 *     `isInherited: true`, `optional: true`, `maxPerTurn: 1` for "[Once Per Turn]".
 */
const cardId = "BT26-034";

const VEGETATION_TRAIT = "Vegetation";
const TS_TRAIT = "TS";

function isVegetationOrTsDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  return cardHasTrait(def, VEGETATION_TRAIT) || cardHasTrait(def, TS_TRAIT);
}

function digivolveCandidates(ctx: EffectContext, ownerSeat: Seat, host?: Permanent): CardInstance[] {
  if (host?.topCard === undefined) return [];
  const base = ctx.game.definitionOf(host.topCard);
  return Array.from(ctx.game.player(ownerSeat).hand).filter(
    (card) =>
      isVegetationOrTsDigimon(ctx.game.definitionOf(card)) &&
      canDigivolveOntoWithAlternates(ctx.game.definitionOf(card), base),
  );
}

/** Turn-relative memory `seat` currently has (positive favors `ctx.game.state.turnSeat`). */
function memoryFor(ctx: EffectContext, seat: Seat): number {
  const m = ctx.game.state.memory;
  return seat === ctx.game.state.turnSeat ? m : -m;
}

function opponentDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => p.topCard !== undefined && !p.inBreeding && !p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as Seat;

    // [Start of Your Main Phase] If you have 4 or less memory, this Digimon may
    // digivolve into a Digimon card with the [Vegetation] or [TS] trait in the hand
    // without paying the cost.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-free-digivolve`,
          description:
            "[Start of Your Main Phase] If you have 4 or less memory, this Digimon may " +
            "digivolve into a Digimon card with the [Vegetation] or [TS] trait in the " +
            "hand without paying the cost.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) =>
            memoryFor(ctx, ownerSeat) <= 4 && digivolveCandidates(ctx, ownerSeat, ctx.source.permanent()).length > 0,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const candidates = digivolveCandidates(ctx, ownerSeat, self);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.digivolveFromInstance(self.permanentId, chosen[0]!, { payCost: false });
          },
        }),
      ];
    }

    // Inherited: [When Attacking] [Once Per Turn] You may suspend 1 of your
    // opponent's Digimon.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-suspend-opponent`,
          description: "[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.",
          isInherited: true,
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => opponentDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = opponentDigimonTargets(ctx, source);
            if (targets.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.suspend(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
