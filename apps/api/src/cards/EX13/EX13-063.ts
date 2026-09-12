import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-063 PrinceMamemon (Black Lv.6 Mega, [Mutant]/Data, 12000 DP, play cost 11).
// Its single printed EvoCost is Black Lv.5 for 3, carried by the catalog. The card prints no
// [Digivolve] header, so there is no `digivolutionRequirement` entry — the catalog EvoCost is the
// only digivolution route (EX13-059 / EX13-048 shape).
//
// Printed clauses:
//   [Assembly -4] 3 Lv.5 or lower [Mamemon] text cards w/different names
//   [On Play] [When Digivolving] [On Deletion] Reveal the top 3 cards of your deck. You may play
//     1 play cost 10 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among
//     them without paying the cost. Trash the rest.
//   [On Deletion] Delete 1 of your opponent's highest play cost Digimon.
//   [All Turns] All of your Digimon with [Mamemon] in their names gain ＜Blocker＞ and ＜Guard＞
// No inherited effect and no security effect are printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §7-3 Assembly: the materials come from the TRASH only, the EXACT count must be placed
//     (§7-3-2-4), the reduction is the flat printed value (§7-3-2-1), and Assembly is never
//     mandatory (§7-3-2-9). All of that lives in `actions/assembly.ts`; the card only supplies the
//     recipe.
//   - §4-23-1 / manual §1 "[X] text card": the token anywhere in the information printed on the
//     card — its name, traits, effects, inherited effects and requirement lines included. So a
//     card NAMED *Mamemon* is a [Mamemon] text card, and so is EX13-046 Kokuwamon, which prints
//     the token only inside its effect text. That is exactly `match: "text"`, documented in
//     `matchNameOrTrait` as the full name/trait/text union.
//   - §4-22-1 names: "with [Mamemon] in its name" is the SUBSTRING reading, so BigMamemon,
//     MetalMamemon and this card itself all answer it, while Kokuwamon does not.
//   - §4-22-2 traits: "the [Mutant] trait" is the EXACT-trait form (`match: "trait"`), not
//     `traitContains`.
//   - §8-8 "without paying the cost": a full waiver, so `to: "play"` with no `costDelta`.
//   - §16-4 ＜Blocker＞ and §16-45 ＜Guard＞ (see below).
//
// [Assembly -4] 3 Lv.5 or lower [Mamemon] text cards w/different names
//   One repeated slot of `count: 3` with `levelMax: 5`, the `match: "text"` reference, and
//   `differentNames: true` — the EX12-060 / EX12-076 single-slot shape. The printed sentence says
//   "cards", not "Digimon cards", so the slot carries NO `kinds` gate (EX12-060's note on the same
//   wording). A card with no level (an Option or Tamer) still cannot qualify: "Lv.5 or lower"
//   needs a level, and `materialMatchesAssemblySlot` refuses an undefined one.
//
// [On Play] [When Digivolving] [On Deletion] Reveal 3; you may free-play 1 matching Digimon.
//   The identical sentence to EX13-059's (one cost ceiling higher) and EX13-028's, so it reuses
//   that accepted encoding verbatim: ONE `RevealAdd`, `revealCount: 3`, a single `add` slot with
//   `to: "play"` plus `optional: true` for the printed "You may", and `rest: "trash"`. Printed
//   under THREE timings with one body, so it compiles to three effects sharing one action factory,
//   not one effect with a compound trigger.
//   The slot's two printed qualifiers are TWO references inside one `nameOrTrait` list, because
//   entries there are a union ("in its name OR the [Mutant] trait") and the two tokens need
//   different match modes. `orPrevious` marks the union explicitly (the BT19-055 / EX13-038 /
//   EX13-059 convention).
//
// [On Deletion] Delete 1 of your opponent's highest play cost Digimon.
//   A SECOND, separate [On Deletion] clause — printed as its own sentence, so it is its own
//   `CardEffect` rather than a second action appended to the reveal body. `superlative:
//   "highestPlayCost"` narrows the pool server-side to the maximum printed play cost and keeps
//   every tied extremum, so `count: 1` makes the controller pick one of the ties (the mirror of
//   EX13-059's `lowestPlayCost`). No "may" and no cost, so the action is mandatory and carries
//   neither `optional` nor `abortOnDecline`.
//
// [All Turns] grants both keywords through continuous auras, including to itself.
// The shared Guard hook binds prevention and fixed self-payment to each live holder,
// so another granted Mamemon may save this grantor while a lone holder cannot save itself.
const mamemonNamed: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
};

const playableMamemonOrMutant: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  playCostLte: 10,
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
  raw: "Reveal the top 3 cards of your deck. You may play 1 play cost 10 or lower Digimon card with [Mamemon] in its name or the [Mutant] trait among them without paying the cost. Trash the rest",
});

const deleteHighestPlayCost = (): Action => ({
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" },
    count: 1,
  },
  raw: "Delete 1 of your opponent's highest play cost Digimon",
});

const grantKeyword = (keyword: "Blocker" | "Guard"): Action => ({
  kind: "Aura",
  target: { filter: mamemonNamed, count: "all" },
  effect: { kind: "keyword", keyword: { keyword, raw: `＜${keyword}＞` } },
  raw: `All of your Digimon with [Mamemon] in their names gain ＜${keyword}＞`,
});

export const compiled: CompiledCard = {
  cardId: "EX13-063",
  effects: [
    { trigger: "OnPlay", actions: [revealAndFreePlay()] },
    { trigger: "WhenDigivolving", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [revealAndFreePlay()] },
    { trigger: "OnDeletion", actions: [deleteHighestPlayCost()] },
    { trigger: "AllTurns", actions: [grantKeyword("Blocker"), grantKeyword("Guard")] },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 4,
      materials: [
        {
          count: 3,
          levelMax: 5,
          nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
          differentNames: true,
        },
      ],
    },
  ],
};

registerIrCard("EX13-063", compiled);
