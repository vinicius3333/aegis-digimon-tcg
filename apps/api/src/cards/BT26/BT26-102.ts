import { EffectDuration, EffectTiming, isDigimon, effectiveStaticNames } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait, permanentHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-102 — Seven Code PAD (BT26, White Option).
 *
 * The committed KB contains Q7127-Q7128 and Q7183-Q7186 (2026-08-18), confirming mixed
 * placement sources, the exact six-card requirement, chosen ordering, optional digivolution,
 * and the linked-trigger timing.
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
 *   ＜Use Req.＞ — a hand-resident color-requirement waiver while the controller has a
 *     [Seven Code] trait card in play.
 *   EffectTiming.SecuritySkill — the [Security] effect (BT26-030's branch convention).
 *     "Add this card to the hand" is the AddToHandSelf idiom: the security card being
 *     checked is the source, so it returns its own instance to hand.
 *   EffectTiming.OnUseOption — the Option's [Main] effect. "By placing 6 ... cards" is a COST:
 *     all six must be payable or the clause does nothing, and the digivolve half only
 *     runs once they are placed. `placeUnder` with its default (non-`belowTop`) mode
 *     unshifts onto the stack, which IS the bottom digivolution position the text asks
 *     for. The digivolve step uses `digivolveFromInstance` with `payCost: false` and
 *     `ignoreRequirements: true`, matching "ignoring digivolution requirements and
 *     without paying the cost"; it is optional ("may").
 *
 *   Cost sources — trash and link cards move through `placeUnder`; battle-area Digimon
 *     move through `relocatePermanentByEffect`, preserving their attached cards under the
 *     recipient as required by the normal place-under rule. The six selected cards are
 *     chosen as one combined pool, and link cards are moved before their hosts so both can
 *     validly contribute when selected together.
 */
const cardId = "BT26-102";

const PLACEMENT_COST = 6;
const DANTEMON = "Dantemon";
const SECURITY_PLAY_COST_CEILING = 5;

type PlacementCandidate =
  | { kind: "loose"; instanceId: string }
  | { kind: "permanent"; instanceId: string; permanentId: string };

function isSevenCodeDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && cardHasTrait(def, "Seven Code");
}

function isDantemon(def: CardDefinition): boolean {
  return effectiveStaticNames(def).some((name) => name.includes(DANTEMON));
}

function hasSevenCodeInPlay(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return permanentHasTrait(ctx.game, permanent, "Seven Code");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
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

            const recipient =
              recipients.length === 1
                ? recipients[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: recipients, min: 1, max: 1 }))[0];
            if (recipient === undefined) return;

            const placementCandidates: PlacementCandidate[] = [];
            for (const permanent of owner.battleArea) {
              if (permanent.inBreeding || permanent.topCard === undefined) continue;
              if (permanent.permanentId !== recipient && isSevenCodeDigimon(ctx.game.definitionOf(permanent.topCard))) {
                placementCandidates.push({
                  kind: "permanent",
                  instanceId: permanent.topCard.instanceId,
                  permanentId: permanent.permanentId,
                });
              }
              for (const linked of permanent.linked) {
                if (isSevenCodeDigimon(ctx.game.definitionOf(linked))) {
                  placementCandidates.push({ kind: "loose", instanceId: linked.instanceId });
                }
              }
            }
            for (const card of owner.trash) {
              if (isSevenCodeDigimon(ctx.game.definitionOf(card))) {
                placementCandidates.push({ kind: "loose", instanceId: card.instanceId });
              }
            }
            if (placementCandidates.length < PLACEMENT_COST) return;

            const placementByInstance = new Map(
              placementCandidates.map((candidate) => [candidate.instanceId, candidate]),
            );
            const candidateIds = placementCandidates.map((candidate) => candidate.instanceId);
            const paid =
              candidateIds.length === PLACEMENT_COST
                ? candidateIds
                : await ctx.ask.selectCards(ctx, {
                    candidates: candidateIds,
                    min: PLACEMENT_COST,
                    max: PLACEMENT_COST,
                  });
            if (paid.length < PLACEMENT_COST) return;

            const selected = paid
              .map((instanceId) => placementByInstance.get(instanceId))
              .filter((candidate): candidate is PlacementCandidate => candidate !== undefined);
            if (selected.length !== PLACEMENT_COST) return;

            // Q7185: when several cards are placed by this effect, their controller chooses
            // their order. `orderCards` returns bottom-to-top order for `stackBottom`; each
            // primitive prepends at stack index 0, so resolution consumes that order in
            // reverse below. Asking separately from the six-card selection also makes the
            // ordering choice explicit to UI clients instead of depending on click order.
            const selectedIds = selected.map((candidate) => candidate.instanceId);
            const orderedIds = ctx.ask.orderCards
              ? await ctx.ask.orderCards(ctx, {
                  candidates: selectedIds,
                  destination: "stackBottom",
                })
              : selectedIds;
            const ordered = orderedIds
              .map((instanceId) => placementByInstance.get(instanceId))
              .filter((candidate): candidate is PlacementCandidate => candidate !== undefined);
            if (ordered.length !== PLACEMENT_COST) return;

            // Both placement primitives prepend at index 0. Apply the chosen cards from
            // top to bottom so the final stack reads in the requested bottom-to-top order,
            // including an interleaving of loose cards and battle-area Digimon.
            for (const candidate of [...ordered].reverse()) {
              if (candidate.kind === "loose") {
                const placed = await ctx.fx.placeUnder(recipient, [candidate.instanceId]);
                if (placed.length !== 1) return;
              } else {
                const moved = await ctx.fx.relocatePermanentByEffect?.(recipient, candidate.permanentId, {
                  belowTop: false,
                  faceUp: true,
                });
                if (moved !== true) return;
              }
            }

            // "that Digimon MAY digivolve into [Dantemon] in the hand".
            const dantemon = owner.hand.filter((c) => isDantemon(ctx.game.definitionOf(c))).map((c) => c.instanceId);
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

    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-seven-code`,
          description: "＜Use Req. ([Seven Code] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => hasSevenCodeInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
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
