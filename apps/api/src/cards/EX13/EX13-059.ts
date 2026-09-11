import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-059 BigMamemon (Black Lv.5 Ultimate, [Mutant]/Data, 8000 DP, play cost 8).
// Its single printed EvoCost is Black Lv.4 for 3, carried by the catalog; the card prints no
// [Digivolve] header, so no `digivolutionRequirement` entry is needed.
//
// Printed clauses:
//   [When Digivolving] [On Deletion] Reveal the top 3 cards of your deck. You may play 1 play
//     cost 7 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them
//     without paying the cost. Trash the rest.
//   [End of Your Turn] [Once Per Turn] By deleting 1 of your Digimon with [Mamemon] in its name,
//     delete 1 of your opponent's Digimon with the lowest play cost.
//   [Inherited] [End of Your Turn] [Once Per Turn] By deleting 1 of your Digimon with [Mamemon]
//     in its name, delete all of your opponent's Digimon with the lowest play cost.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §4-22-1 card names: "with [X] in its name" is the SUBSTRING reading, so BigMamemon,
//     MetalMamemon and PrinceMamemon all answer [Mamemon], while a card that only prints
//     "[Mamemon]" inside its effect text (EX13-046 Kokuwamon) does not. That substring reading
//     also means THIS card answers its own deletion cost — the clause says "1 of your Digimon",
//     not "1 of your OTHER Digimon", so no `excludeSelf`.
//   - §4-22-2 traits: "with the [Mutant] trait" is the EXACT-trait form, so `match: "trait"`
//     rather than `traitContains` (which is reserved for "with [X] in any of its traits").
//   - §8-8 "without paying the cost": a full waiver, which is `to: "play"` with no `costDelta`.
//   - §2-6 play cost: the printed cost, which is what `playCostLte` and the `lowestPlayCost`
//     superlative both compare.
//
// The reveal clause is printed under two timings with one body, so it compiles to two effects
// sharing one action factory — the EX13-028 / EX13-013 shape, not one effect with a compound
// trigger. EX13-028 (Sukamon) prints the identical sentence at a different cost ceiling and name
// family, so this reuses its encoding verbatim: ONE `RevealAdd` with revealCount 3, a single
// `add` slot with `to: "play"` and `optional: true` for the printed "You may", and
// `rest: "trash"` for "Trash the rest".
//
// The slot's two printed qualifiers live as TWO references inside one `nameOrTrait` list, because
// entries there are always a union ("in its name OR the [Mutant] trait"). They cannot be merged
// into one reference: the tokens use different match modes. `orPrevious` marks the union
// explicitly, the BT19-055 / EX13-038 convention.
//
// Both [End of Your Turn] clauses are a "By <cost>, <effect>" sentence, which is the EX6-041 /
// EX12-062 shape: the effect action carries the `deleteOwn` cost, `optional: true` (the controller
// may decline to pay) and `abortOnDecline: true`. `allowCostWithoutTarget` is deliberately NOT
// set — no ruling permits paying this cost with no opponent Digimon to delete, so with an empty
// opponent board the window never opens and the fodder survives.
//
// "delete 1 / delete all of your opponent's Digimon with the lowest play cost" is
// `superlative: "lowestPlayCost"`, which narrows the eligible pool server-side to the minimum
// printed play cost and keeps every tied extremum. The only difference between the battle-area
// clause and the inherited one is `count`: `1` (the controller picks one of the tied minima)
// versus `"all"` (every tied minimum dies) — the EX10-073 and EX6-060 / LM-043 encodings
// respectively.
const playableMamemonOrMutant: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  playCostLte: 7,
  nameOrTrait: [
    { tokens: ["Mamemon"], match: "name" },
    { tokens: ["Mutant"], match: "trait", orPrevious: true },
  ],
};

const revealAndFreePlay = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [{ filter: playableMamemonOrMutant, count: 1, to: "play", optional: true }],
  rest: "trash",
  raw: "Reveal the top 3 cards of your deck. You may play 1 play cost 7 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest",
});

const deleteLowestPlayCost = (count: 1 | "all"): Action => ({
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
    count,
  },
  cost: {
    kind: "deleteOwn",
    target: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
      },
      count: 1,
    },
    raw: "By deleting 1 of your Digimon with [Mamemon] in its name",
  },
  optional: true,
  abortOnDecline: true,
  raw:
    count === "all"
      ? "By deleting 1 of your Digimon with [Mamemon] in its name, delete all of your opponent's Digimon with the lowest play cost"
      : "By deleting 1 of your Digimon with [Mamemon] in its name, delete 1 of your opponent's Digimon with the lowest play cost",
});

export const compiled: CompiledCard = {
  cardId: "EX13-059",
  effects: [
    { trigger: "WhenDigivolving", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [revealAndFreePlay()] },
    { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [deleteLowestPlayCost(1)] },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [deleteLowestPlayCost("all")],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-059", compiled);
