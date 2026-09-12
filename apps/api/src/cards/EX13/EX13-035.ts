import type { Action, CardEffect, CompiledCard, Condition, Cost, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-035 KingEtemon (Digimon, Yellow, Lv.6 Mega [Puppet], Virus, 13000 DP, play cost 13,
// printed EvoCosts Yellow Lv.5 for 5 and Black Lv.5 for 5).
//
// Printed main text:
//   [Digivolve] Lv.5 w/[Sukamon]/[Etemon] in name: Cost 4
//   [On Play] [When Digivolving] You may play up to 2 Digimon cards with [Chuumon], [Sukamon]
//     or [Etemon] in their names and up to 6 total play cost from your hand or trash without
//     paying the costs. By returning 10 such cards from your trash to the bottom of the deck,
//     add 6 to the play cost maximum.
//   [All Turns] While there are 3 or more Digimon with [Sukamon] or [Etemon] in their names,
//     give all of your opponent's Digimon ＜Security A. -1＞ and -3000 DP.
// No printed inherited text and no printed security text (the catalog carries neither field).
//
// KB: `node tools/kb/query.mjs card EX13-035` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist yet. The general rules this implementation leans on:
//   - comprehensive §4-22-1 (card names): "with [X] in its name" is the SUBSTRING reading, so
//     ChuuChuumon / PlatinumSukamon / KingSukamon / MetalEtemon / this card itself all match.
//   - comprehensive §3-4-7-5 / §3-4-7-8: cards in a breeding area can neither be chosen by nor
//     have their information referenced by effects that do not name the breeding area. Both the
//     "3 or more Digimon" gate and the opponent-Digimon aura are therefore battle-area scoped.
//   - comprehensive §6-4 / §4-17: an effect-driven free play still enters the battle area as a
//     play, so the played card's own [On Play] window fires (PlayWithoutCost's normal contract).
//
// The card is the second printing of KingEtemon; BT13-076 is the first and prints the identical
// "[Digivolve] Lv.5 w/[Etemon] or [Sukamon] in name: Cost 4" header and the same
// "-3000 DP and ＜Security A. -1＞" debuff vocabulary, so the name references and the keyword ref
// are copied from that module verbatim (`match: "name"`, `keyword: "SecurityAttack", amount: -1`).

// "Digimon cards with [Chuumon], [Sukamon] or [Etemon] in their names". One reference holding
// three tokens, because `tokens` is an OR-list — three separate references would read as a
// conjunction (the EX13-027 / BT13-076 convention for this very archetype).
const NAME_TOKENS = ["Chuumon", "Sukamon", "Etemon"] as const;

// The playable pool. `playCostLte` is the printed play-cost maximum as it applies to any ONE
// card: a single card costing more than the maximum can never fit it, which is the same
// derivation `resolveTotalPlayCostBudgetTargets` makes server-side before it starts summing.
// `controller: "mine"` plus `from: ["hand", "trash"]` is the printed "from your hand or trash".
const playablePool = (playCostMaximum: number): Filter => ({
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: [...NAME_TOKENS], match: "name" }],
  playCostLte: playCostMaximum,
});

// "By returning 10 such cards from your trash to the bottom of the deck": "such cards" carries
// the whole preceding description, so the cost pool is the same Digimon-card name union, read
// out of the controller's trash. Same shape as BT23-057's three-card trash return, with
// `to: "deckBottom"` rather than that card's printed "top or bottom".
const returnTenSuchCards: Cost = {
  kind: "return",
  target: {
    filter: {
      zone: "trash",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: [...NAME_TOKENS], match: "name" }],
    },
    count: 10,
  },
  to: "deckBottom",
  raw: "by returning 10 such cards from your trash to the bottom of the deck",
};

// "play up to 2 Digimon cards ... and up to 6 total play cost ... without paying the costs".
// `count: 2` + `upTo: true` is the printed card-count cap; `payCost: false` the free play.
// `totalPlayCostBudget` declares the printed AGGREGATE cap. The loose-card selector
// forwards it to the decision API, which enforces the sum independently of the per-card ceiling.
const playFree = (playCostMaximum: number, cost?: Cost): Action => ({
  kind: "PlayWithoutCost",
  target: {
    filter: playablePool(playCostMaximum),
    count: 2,
    upTo: true,
    totalPlayCostBudget: playCostMaximum,
  },
  from: ["hand", "trash"],
  payCost: false,
  ...(cost === undefined ? {} : { cost }),
  raw: `play up to 2 Digimon cards with [Chuumon], [Sukamon] or [Etemon] in their names and up to ${playCostMaximum} total play cost from your hand or trash without paying the costs`,
});

// The sentence offers ONE free play whose maximum is either the printed 6 or, if the controller
// pays the trash return, 6 + 6 = 12. Two `PlayWithoutCost` actions in sequence would let BOTH
// resolve and play up to four cards, so the two maxima are exclusive branches of a `Modal` with
// `choose: 1`. The printed "You may" is the Modal's own `optional`, which is what lets the whole
// clause be declined; the branches themselves are then mandatory once chosen (BT17-050's
// Q2803/Q2804 shape, where an unactivatable modal is never charged).
//
// The paid branch needs no `optionConditions` gate: `optionIsAvailable` already runs each bullet
// through `canAttemptModalAction` -> `canPayCost`, so a trash holding fewer than 10 matching cards
// drops branch 1 from the offer and the base branch then resolves with no choice prompt at all.
// (A `selfHasMinTrash` condition restating that was behaviourally inert in a mutation run, so it
// is left off rather than carried as an unproven field.)
const playClause = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [
    {
      kind: "Modal",
      choose: 1,
      optional: true,
      labels: [
        "play up to 2 such cards with up to 6 total play cost",
        "return 10 such cards from your trash to the bottom of the deck, then play up to 2 such cards with up to 12 total play cost",
      ],
      options: [[playFree(6)], [playFree(12, returnTenSuchCards)]],
      raw: "You may play up to 2 Digimon cards with [Chuumon], [Sukamon] or [Etemon] in their names and up to 6 total play cost from your hand or trash without paying the costs. By returning 10 such cards from your trash to the bottom of the deck, add 6 to the play cost maximum.",
    },
  ],
});

// "While there are 3 or more Digimon with [Sukamon] or [Etemon] in their names" — no "you have",
// so the count spans BOTH players' battle areas: `anyHas`, whose interpreter branch counts with
// `controller: "any"` unless the filter names a side (the same reading EX13-027 applies to its
// "1 other Digimon" cost). `zone: "battleArea"` keeps breeding-area Digimon out per §3-4-7-8.
// This card's own name carries [Etemon], so a live KingEtemon is itself one of the three.
const threeOrMoreNamed: Condition = {
  kind: "anyHas",
  filter: {
    zone: "battleArea",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Sukamon", "Etemon"], match: "name" }],
  },
  countMin: 3,
  raw: "there are 3 or more Digimon with [Sukamon] or [Etemon] in their names",
};

// An [All Turns] "While ..., give ..." is a CONTINUOUS grant, not a one-shot: `Aura` with a
// `while` gate is the shape whose continuous layer re-checks the condition on every recompute,
// so the debuff disappears the moment the third named Digimon leaves. `count: "all"` covers
// later entrants the same way BT3-040 and BT5-058 do for their own board-wide auras. `Aura`
// confers exactly one behavior per record, so the two printed grants are two actions.
const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

const securityAttackDebuff: Action = {
  kind: "Aura",
  target: { filter: opponentDigimon, count: "all" },
  effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security A. -1＞" } },
  while: threeOrMoreNamed,
  raw: "give all of your opponent's Digimon ＜Security A. -1＞",
};

const dpDebuff: Action = {
  kind: "Aura",
  target: { filter: opponentDigimon, count: "all" },
  effect: { kind: "modifyDP", amount: -3000 },
  while: threeOrMoreNamed,
  raw: "give all of your opponent's Digimon -3000 DP",
};

export const compiled: CompiledCard = {
  effects: [
    playClause("OnPlay"),
    playClause("WhenDigivolving"),
    { trigger: "AllTurns", actions: [securityAttackDebuff, dpDebuff] },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] Lv.5 w/[Sukamon]/[Etemon] in name: Cost 4" — a SUBSTRING name gate (`names`)
  // plus the printed level, identical to BT13-076's header for the same card name. It is wider
  // than either catalog EvoCost (Yellow Lv.5 / Black Lv.5 for 5): a Lv.5 KingSukamon of any
  // color reaches this card for 4.
  digivolutionRequirement: [{ level: 5, names: ["Sukamon", "Etemon"], cost: 4, isAlternate: true }],
};

registerIrCard("EX13-035", compiled);
