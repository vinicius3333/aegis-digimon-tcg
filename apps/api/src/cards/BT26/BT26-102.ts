import { EffectTiming, isDigimon, effectiveStaticNames } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-102 — Seven Code PAD (BT26, White Option).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-102` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   ＜Use Req. ([Seven Code] trait)＞
 *   [Main] By placing 6 [Seven Code] trait Digimon cards from your battle area, link cards
 *     or trash as 1 of your [Seven Code] trait Digimon's bottom digivolution cards, that
 *     Digimon may digivolve into [Dantemon] in the hand, ignoring digivolution requirements
 *     and without paying the cost.
 *   [Security] You may play 1 play cost 5 or lower [Appmon] trait card from your hand or
 *     trash without paying the cost. Then, add this card to the hand.
 *
 * Clause mapping:
 *   ＜Use Req.＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader (engine/combat/keywords.ts).
 *   EffectTiming.SecuritySkill — the [Security] effect (BT26-030's branch convention).
 *     "Add this card to the hand" is the AddToHandSelf idiom: the security card being
 *     checked is the source, so it returns its own instance to hand.
 *   EffectTiming.OnDeclaration — the [Main] effect. "By placing 6 ... cards" is a COST:
 *     all six must be payable or the clause does nothing, and the digivolve half only
 *     runs once they are placed. `placeUnder` with its default (non-`belowTop`) mode
 *     unshifts onto the stack, which IS the bottom digivolution position the text asks
 *     for. The digivolve step uses `digivolveFromInstance` with `payCost: false` and
 *     `ignoreRequirements: true`, matching "ignoring digivolution requirements and
 *     without paying the cost"; it is optional ("may").
 *
 *   RESIDUAL — cost sources: `placeUnder` moves LOOSE instances only (its removal path
 *     spans hand / security / deck / trash), so of the three printed sources only TRASH
 *     is reachable today. Taking a battle-area permanent's own card, or a link card, out
 *     of play and into another permanent's stack has no primitive: the battle-area and
 *     link-card halves of the cost are therefore not payable yet. The clause is gated on
 *     the full 6 being available from trash, so it never resolves on a partial cost —
 *     it under-triggers rather than resolving wrongly.
 */
const cardId = "BT26-102";

const PLACEMENT_COST = 6;
const DANTEMON = "Dantemon";
const SECURITY_PLAY_COST_CEILING = 5;

function isSevenCodeDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && cardHasTrait(def, "Seven Code");
}

function isDantemon(def: CardDefinition): boolean {
  return effectiveStaticNames(def).some((name) => name.includes(DANTEMON));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-six-and-digivolve`,
          description:
            "[Main] By placing 6 [Seven Code] trait Digimon cards from your battle area, link " +
            "cards or trash as 1 of your [Seven Code] trait Digimon's bottom digivolution cards, " +
            "that Digimon may digivolve into [Dantemon] in the hand, ignoring digivolution " +
            "requirements and without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            // The recipient: 1 of your [Seven Code] trait Digimon.
            const recipients = owner.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                return isSevenCodeDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);
            if (recipients.length === 0) return;

            // The cost pool (see RESIDUAL above: trash only).
            const payable = owner.trash
              .filter((c) => isSevenCodeDigimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (payable.length < PLACEMENT_COST) return;

            const recipient =
              recipients.length === 1
                ? recipients[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: recipients, min: 1, max: 1 }))[0];
            if (recipient === undefined) return;

            const paid =
              payable.length === PLACEMENT_COST
                ? payable
                : await ctx.ask.selectCards(ctx, {
                    candidates: payable,
                    min: PLACEMENT_COST,
                    max: PLACEMENT_COST,
                  });
            if (paid.length < PLACEMENT_COST) return;

            const placed = await ctx.fx.placeUnder(recipient, paid);
            if (placed.length === 0) return;

            // "that Digimon MAY digivolve into [Dantemon] in the hand".
            const dantemon = owner.hand
              .filter((c) => isDantemon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (dantemon.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates: dantemon, min: 0, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.digivolveFromInstance(recipient, chosen[0]!, {
              payCost: false,
              ignoreRequirements: true,
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-appmon`,
          description:
            "[Security] You may play 1 play cost 5 or lower [Appmon] trait card from your hand " +
            "or trash without paying the cost. Then, add this card to the hand.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = [...owner.hand, ...owner.trash]
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return cardHasTrait(def, "Appmon") && (def.playCost ?? 0) <= SECURITY_PLAY_COST_CEILING;
              })
              .map((c) => c.instanceId);

            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
              if (chosen.length > 0) await ctx.fx.playInstances([chosen[0]!], { payCost: false });
            }

            // "Then, add this card to the hand" — unconditional, even when nothing was played.
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
