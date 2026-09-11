import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-046 Kokuwamon (Digimon, Black, Lv.3 Rookie [Machine], Data, play cost 3, DP 2000).
//
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Mamemon] in its text and
// 1 card with the [Mutant] trait among them to the hand. Return the rest to the bottom of
// the deck.
//   Sibling EX13-009 prints the same "Add 1 <A> and 1 <B> among them" layout, so this reuses
//   its shape: ONE `RevealAdd` over a 3-card reveal with TWO `add` slots, each `count: 1`.
//   A single slot carrying both references in `orFilters` would take one card out of the
//   pooled union instead of one per qualifier, which is the wrong reading of the "and" form
//   (KB Q2625 governs the "or" form, not this one).
//
//   "with [Mamemon] in its text" is comprehensive rules §4-22-1: the token anywhere in the
//   card's printed information, which the engine models as `match: "text"` (name ∪ traits ∪
//   every printed text field). `match: "name"` would wrongly drop cards such as BT8-106
//   Senbon Dokkan that only name [Mamemon] inside an effect.
//
//   "with the [Mutant] trait" is the exact-trait form, so `match: "trait"` — not
//   `traitContains`, which is reserved for "with [X] in any of its traits". The exact match
//   is what keeps BT12-071 AncientWisemon's [Ancient Mutant] out of the slot.
//
//   Neither slot names a card kind ("1 card", not "1 Digimon card"), so neither filter
//   carries a `kind` — EX13-008's single-slot shape, widened to two slots. The sentence
//   prints no "you may", so both slots are mandatory, and `rest: "deckBottom"` is the
//   printed "Return the rest to the bottom of the deck".
//
// [Inherited] [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
//   Byte-identical to BT20-073's and EX9-052's inherited line, so it reuses their accepted
//   encoding: an `isInherited` `OnDeletion` effect with a single `DeDigivolve` action,
//   `amount: 1`, targeting 1 opponent Digimon. Comprehensive §16-12-1 defines the keyword as
//   trashing cards from the chosen stack starting with the top card; the engine's
//   `DeDigivolve` action is that keyword. No "may", so it is mandatory.
//
// No `digivolutionRequirement`: the card prints no [Digivolve] clause, so its single Black
// Lv.2 evoCost is the ordinary catalog route and needs no IR entry.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mutant"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-046", compiled);
