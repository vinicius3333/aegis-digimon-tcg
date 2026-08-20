import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import {
  beforePayCost,
  onPlay,
  whenDigivolving,
  whenAttacking,
  staticModifier,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-045 — GranKuwagamon (BT26, Green Lv.6 Digimon).
//
// The committed KB contains Q7036-Q7038 and Q7077 (2026-08-18), confirming the hand-size
// timing, free-play/Alliance interaction, and stacked cost reductions for this card.
//
// Printed text:
//   [Digivolve] Lv.5 w/[Insectoid]/[TS] trait: Cost 3 — a digivolution-cost requirement,
//     not an effect clause; already carried by CardDefinition.evoCosts in cards.json, so
//     it needs no entry here.
//   When this card would be played, if your hand has fewer cards than your opponent's,
//     reduce the cost by 4.
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 level 4
//     or lower [Insectoid] or [Titan] trait Digimon card from your hand without paying
//     the cost.
//   [Your Turn] All of your [Insectoid] or [Titan] trait Digimon gain ＜Alliance＞,
//     ＜Piercing＞ and ＜Vortex＞.
//
// Clause mapping:
//   EffectTiming.BeforePayCost — "When this card would be played, if your hand has fewer
//     cards than your opponent's, reduce the cost by 4." Modeled on BT16-065's
//     `beforePayCost` + `ctx.playCostDelta` shape (the pay-time cost window fired while
//     this card is still loose in hand, per card-module contract — `wouldBePlayed` replacement
//     subscriptions are never consulted by the play-cost step). The hand-size comparison
//     reads both hands at that moment, which still includes this card in the controller's
//     own hand (consistent with the printed condition being checked before the card leaves
//     the hand).
//
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving / EffectTiming.OnUseAttack (shared
//     effectKey, one "Once Per Turn" budget spanning all three timings) — "You may play 1
//     level 4 or lower [Insectoid] or [Titan] trait Digimon card from your hand without
//     paying the cost." Modeled on BT26-042's shared-effectKey + `maxPerTurn: 1` idiom for
//     a single per-turn budget spanning multiple trigger timings, and on BT17-068's
//     optional-select-then-`playInstances({payCost:false})` shape for the free play.
//
//   EffectTiming.None (staticModifier, gated `isOnBattleArea() && isOwnersTurn()`) —
//     "[Your Turn] All of your [Insectoid] or [Titan] trait Digimon gain ＜Alliance＞,
//     ＜Piercing＞ and ＜Vortex＞." Modeled on BT20-089's ESS keyword-grant shape, broadened
//     from "this Digimon" to a loop over every matching battle-area Digimon the controller
//     owns (BT26-042's `insectoidOrTitanTargets` helper). ＜Alliance＞ and ＜Vortex＞ use the
//     generic `ctx.fx.grantKeyword`; ＜Piercing＞ uses the dedicated `ctx.fx.grantPierce`
//     (EX3-036 / BT20-089 convention).

const cardId = "BT26-045";
const INSECTOID_TRAIT = "Insectoid";
const TITAN_TRAIT = "Titan";
const MAX_HAND_PLAY_LEVEL = 4;

function hasInsectoidOrTitanTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return types.includes(INSECTOID_TRAIT) || types.includes(TITAN_TRAIT);
}

/** Battle-area Insectoid/Titan Digimon permanents the controller owns. */
function insectoidOrTitanBattleTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      !p.inBreeding &&
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasInsectoidOrTitanTrait(ctx.game.definitionOf(p.topCard)),
  );
}

/** Hand candidates for the free-play clause: level ≤4 Insectoid/Titan Digimon cards. */
function freePlayHandCandidates(ctx: EffectContext, source: CardSource) {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return (
      isDigimon(def) && def.level !== undefined && def.level <= MAX_HAND_PLAY_LEVEL && hasInsectoidOrTitanTrait(def)
    );
  });
}

/**
 * "You may play 1 level 4 or lower [Insectoid] or [Titan] trait Digimon card from your
 * hand without paying the cost." Shared by [On Play], [When Digivolving] and [When
 * Attacking], all under one "Once Per Turn" budget.
 */
async function resolveFreePlayInsectoidOrTitan(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = freePlayHandCandidates(ctx, source);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.playInstances(chosen, { payCost: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // When this card would be played, if your hand has fewer cards than your
    // opponent's, reduce the cost by 4.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-fewer-hand-cards`,
          description:
            "When this card would be played, if your hand has fewer cards than your " +
            "opponent's, reduce the cost by 4.",
          resolve: async (ctx) => {
            const ownerHandCount = ctx.game.player(source.ownerSeat).hand.length;
            const opponentHandCount = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).hand.length;
            if (ownerHandCount < opponentHandCount) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 4;
            }
          },
        }),
      ];
    }

    // [On Play] [Once Per Turn] You may play 1 level 4 or lower [Insectoid] or [Titan]
    // trait Digimon card from your hand without paying the cost.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/free-play-insectoid-or-titan`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 " +
            "level 4 or lower [Insectoid] or [Titan] trait Digimon card from your hand " +
            "without paying the cost.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => freePlayHandCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveFreePlayInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/free-play-insectoid-or-titan`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 " +
            "level 4 or lower [Insectoid] or [Titan] trait Digimon card from your hand " +
            "without paying the cost.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => freePlayHandCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveFreePlayInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/free-play-insectoid-or-titan`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 " +
            "level 4 or lower [Insectoid] or [Titan] trait Digimon card from your hand " +
            "without paying the cost.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => freePlayHandCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveFreePlayInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [Your Turn] All of your [Insectoid] or [Titan] trait Digimon gain <Alliance>,
    // <Piercing> and <Vortex>.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-grant-alliance-piercing-vortex`,
          description:
            "[Your Turn] All of your [Insectoid] or [Titan] trait Digimon gain <Alliance>, " +
            "<Piercing> and <Vortex>.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const perm of insectoidOrTitanBattleTargets(ctx, source)) {
              ctx.fx.grantKeyword(perm.permanentId, "Alliance", EffectDuration.UntilEachTurnEnd);
              ctx.fx.grantPierce(perm.permanentId, EffectDuration.UntilEachTurnEnd);
              ctx.fx.grantKeyword(perm.permanentId, "Vortex", EffectDuration.UntilEachTurnEnd);
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
