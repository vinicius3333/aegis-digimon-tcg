import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-009 Huckmon (Digimon, Red/White, Lv.3 Rookie [Mini Dragon], 3 cost, 2000 DP).
//
// [On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Huckmon] or
// [Sistermon] in its text and 1 such Tamer card or Option card among them to the hand.
// Return the rest to the bottom of the deck.
// [Your Turn] [Once Per Turn] When any of your white Digimon are played, gain 1 memory.
//
// Both printed clauses already have near-twins in the codebase, so the IR follows them rather
// than inventing shapes:
//   * the reveal is ST20-02's "add 1 Digimon card ... and 1 such Tamer card or Option card"
//     layout — two `add` slots over one 3-card reveal, the second slot's `kind` carrying the
//     Tamer ∪ Option union. A single slot with `orFilters` would take one card from the whole
//     union instead of one per category, which is the wrong reading here (KB Q2625 governs the
//     "or" form, not this "and" form).
//   * the inherited clause is byte-identical to BT23-006's, whose `SubTrigger` on `whenPlayed`
//     with a `controller: "mine"` white-Digimon `sourceFilter` is the accepted encoding. The
//     `YourTurn` wrapper plus `frequency: "OncePerTurn"` supplies the two printed brackets.
//
// "in its text" is comprehensive rules §4-22-1: the token anywhere in the card's printed
// information, which the engine models as `match: "text"` (name ∪ traits ∪ every printed text
// field). `match: "name"` — which BT23-006 correctly uses for its own differently worded
// "in its name" clause — would wrongly drop cards such as BT13-019 Gankoomon that only name
// [Sistermon] inside an effect. One reference holding both tokens keeps them an OR-union.
//
// "such" carries the whole qualifier forward, so the second slot repeats the same tokens and
// match mode; only the card kind differs between the slots.
//
// No `digivolutionRequirement`: the card prints no [Digivolve] clause, so its single Red Lv.2
// evoCost is the ordinary catalog route and needs no IR entry.
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
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Huckmon", "Sistermon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Tamer", "Option"],
                nameOrTrait: [{ tokens: ["Huckmon", "Sistermon"], match: "text" }],
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
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["White"],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-009", compiled);
