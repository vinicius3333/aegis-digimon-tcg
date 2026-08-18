import {
  CardColor,
  EffectTiming,
  isDigimon,
  isTamer,
  requireCardDefinition,
} from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT11-016 Phoenixmon (Red Digimon).
// rules KB (binding over the printed text):
//   - Q2058: the [Your Turn] trigger fires on the FIRST card removed from the
//     opponent's security stack during an attack and, being [Once Per Turn], can
//     re-activate the [On Deletion] effect at most once per turn (NOT once per checked
//     card, even when checking multiple cards via <Security A. +1>).
//   - Q2059: the trait gate accepts any trait CONTAINING Avian/Bird/Beast/Animal/
//     Sovereign regardless of other words or pluralization, EXCEPT exactly [Sea Animal].
//   - Q2060/Q2061: the maximum DP is 3000 + 2000 per red Tamer the controller has in
//     play, and that scaling applies ONLY to this card's own [On Deletion] play.
const cardId = "BT11-016";

const PLAY_TRAIT_TOKENS = ["avian", "bird", "beast", "animal", "sovereign"];
const EXCLUDED_TRAIT = "sea animal";
const BASE_MAX_DP = 3000;
const DP_PER_RED_TAMER = 2000;

/**
 * Q2059: a trait CONTAINING one accepted token (regardless of other words or
 * pluralization), but never exactly [Sea Animal].
 *
 * Trait data (CardDefinition.types) is populated in the shared card-data table (the
 * 2026-06-03 trait-data fix; A3-proven by BT16-050), so this predicate now matches the
 * live red Avian/Bird/Beast/Animal/Sovereign candidate pool. The scaling max-DP cap and
 * this trait gate are proven against the populated data — including a real-engine
 * fires-on-deletion case — by BT11-016.test.ts (fails-when-reverted: a flat-3000 cap or
 * empty types drive it RED).
 */
function hasPlayableTrait(definition: CardDefinition): boolean {
  return (definition.types ?? []).some((trait) => {
    const normalized = trait.toLowerCase();
    if (normalized === EXCLUDED_TRAIT) return false;
    return PLAY_TRAIT_TOKENS.some((token) => normalized.includes(token));
  });
}

/** Q2060: 3000 DP, plus 2000 for each red Tamer this card's controller has in play. */
function maxPlayableDp(ctx: EffectContext): number {
  const controller = ctx.game.player(ctx.source.ownerSeat);
  const redTamers = controller.battleArea.filter((permanent) => {
    if (permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return isTamer(definition) && definition.colors.includes(CardColor.Red);
  }).length;
  return BASE_MAX_DP + DP_PER_RED_TAMER * redTamers;
}

function isPlayCandidate(definition: CardDefinition, maxDp: number): boolean {
  return (
    isDigimon(definition) &&
    definition.colors.includes(CardColor.Red) &&
    definition.dp <= maxDp &&
    hasPlayableTrait(definition)
  );
}

/**
 * The [On Deletion] play body, shared by the printed [On Deletion] effect and the
 * [Your Turn] re-activation (documented behavior runs the same effect from both timings: the
 * trigger enumerates this Digimon's [On Deletion] effects and activates the chosen one,
 * and this card has exactly one). Play 1 matching red Digimon from hand without paying
 * its cost; the controller may decline by selecting none.
 */
async function playRedDigimonFromHand(ctx: EffectContext): Promise<void> {
  const controller = ctx.game.player(ctx.source.ownerSeat);
  const maxDp = maxPlayableDp(ctx);
  const candidates = Array.from(controller.hand).filter((card) =>
    isPlayCandidate(requireCardDefinition(card.cardId), maxDp),
  );
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.playFromHand(chosen, { payCost: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn][Once Per Turn] When a card is removed from your opponent's security
    // stack, you may activate 1 of this Digimon's [On Deletion] effects.
    //
    // OnLoseSecurity is fired by runSecurityCheck for each card removed during a
    // security check, which only happens to the DEFENDER's stack during an attack; on
    // the owner's turn the defender is the opponent, so isOwnersTurn is the exact
    // maxPerTurn:1 enforces [Once Per Turn] (Q2058: at most one re-activation per turn,
    // on the first removal).
    if (timing === EffectTiming.OnLoseSecurity) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/reactivate-on-deletion`,
          description:
            "[Your Turn][Once Per Turn] When a card is removed from your opponent's " +
            "security stack, you may activate 1 of this Digimon's [On Deletion] effects.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: playRedDigimonFromHand,
        }),
      ];
    }

    // [On Deletion] You may play 1 red Digimon with [Avian], [Bird], [Beast], [Animal],
    // or [Sovereign] in one of its traits (other than [Sea Animal]) and 3000 DP or less
    // from your hand without paying the cost. For each red Tamer you have in play, add
    // 2000 to the maximum DP of the card you can play by this effect.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/play-red-digimon`,
          description:
            "[On Deletion] You may play 1 red Digimon with [Avian], [Bird], [Beast], " +
            "[Animal], or [Sovereign] in one of its traits (other than [Sea Animal]) and " +
            "3000 DP or less from your hand without paying the cost. For each red Tamer " +
            "you have in play, add 2000 to the maximum DP of the card you can play by " +
            "this effect.",
          optional: true,
          resolve: playRedDigimonFromHand,
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
