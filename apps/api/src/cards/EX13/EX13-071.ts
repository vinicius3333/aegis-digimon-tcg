import type { Action, Cost, Filter, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-071 Richard Sampson (Yellow Tamer, [DATA SQUAD], play cost 4).
//
// Printed clauses:
//   [Start of Your Main Phase] [On Play] You may place your deck's top card face down under
//     this Tamer. Then, if your opponent has a Digimon, gain 1 memory.
//   [Main] [Once Per Turn] By trashing 3 bottom face-down cards from under any of your Tamers
//     and placing 1 each of level 4 and level 5 [Holy Beast] trait yellow Digimon cards from
//     your trash as 1 of your [Kudamon]'s bottom digivolution cards, it may digivolve into
//     [Kentaurosmon] in the hand or trash, ignoring level and with the cost reduced by 1.
//   [Security] Play this card without paying the cost.
//
// KB: `node tools/kb/query.mjs card EX13-071` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist yet. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-6 / §4-6-9 stacked cards: a card placed face down under a Tamer is a stacked card of
//     that Tamer; stacking order can't be rearranged, which is why the placement below pins
//     `position: "bottom"` rather than leaving the end open.
//   - §3-4-5-8 breeding-area cards can't be referenced, so the board-reading gate on the memory
//     clause pins `zone: "battleArea"`.
//   - §15-8-4-4-1 an "by ..." activation cost must be paid in full or the effect does not
//     activate; the compound cost below is therefore all-or-nothing (neither half is partial).

// ---------------------------------------------------------------------------------------------
// [Start of Your Main Phase] [On Play]
// ---------------------------------------------------------------------------------------------
// One printed sentence under two timings, so the two effects share one action list — the
// ST24-13 / ST24-14 / ST23-13 shape, which prints this clause verbatim ("place the top card of
// your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory").
//
// `fromDeckTop` places `player.deck[0]` with no prompt: "your deck's top card" names the card,
// it is not a selection. `faceDown: true` is what makes it a §4-6-9 face-down card under a
// Tamer (the currency the [Main] clause below spends) rather than a public digivolution card.
//
// "You may" scopes ONLY the placement, so `optional` sits on the PlaceUnder alone and carries no
// `abortOnDecline`: "Then, ... gain 1 memory" still resolves after a declined placement.
const startOfMainPhaseActions: Action[] = [
  {
    kind: "PlaceUnder",
    target: { filter: { controller: "mine" }, count: 1 },
    fromDeckTop: true,
    faceDown: true,
    position: "bottom",
    optional: true,
  },
  {
    kind: "GainMemory",
    amount: 1,
    condition: {
      kind: "opponentHas",
      filter: { controllerDefault: "opponent", kind: ["Digimon"], zone: "battleArea" },
      raw: "if your opponent has a Digimon",
    },
  },
];

// ---------------------------------------------------------------------------------------------
// [Main] [Once Per Turn] — the compound activation cost
// ---------------------------------------------------------------------------------------------
// "3 bottom face-down cards from under any of your Tamers" is the dedicated
// `trashBottomFaceDownUnderTamer` cost (ST24-06 / ST24-10 / BT26-070 / EX13-032 all print the
// 1- or 2-card form of this exact sentence). It pools the bottom face-down card of EVERY
// eligible Tamer, so the three cards may come from one Tamer or be spread across several.
const trashThreeFaceDown: Cost = {
  kind: "trashBottomFaceDownUnderTamer",
  controller: "mine",
  count: 3,
  raw: "by trashing 3 bottom face-down cards from under any of your Tamers",
};

// "1 each of level 4 and level 5 [Holy Beast] trait yellow Digimon cards from your trash".
//   - "1 each of level 4 and level 5" is TWO single-card placement components, one per printed
//     level — the BT26-098 "[Sunflowmon] + [Lilamon]" shape, whose two named materials are also
//     two `place` components of one compound cost. Folding them into one two-card slot with
//     `levels: [4, 5]` + `distinctLevels` looked equivalent but is not: `canPayCost` does not
//     evaluate `distinctLevels`, so a trash holding two level-4 [Holy Beast] yellow Digimon
//     preflighted as payable, trashed the three face-down cards, and only then failed the
//     placement — a partially paid, all-or-nothing cost. Level-pinned components make the
//     preflight exact.
//   - "[Holy Beast] trait" is the "w/[X] trait" reading, so `match: "trait"` (exact trait
//     equality — the EX13-026 / EX13-036 reading for this same trait). A [Beastkin] card is
//     refused where a containment reading would wrongly accept it.
//   - "yellow" is `colors: ["Yellow"]`, which a multicolor card including Yellow still satisfies.
const holyBeastMaterial = (level: number): Filter => ({
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  colors: ["Yellow"],
  levels: [level],
  nameOrTrait: [{ tokens: ["Holy Beast"], match: "trait" }],
});

// "as 1 of your [Kudamon]'s bottom digivolution cards" — the HOST is chosen separately from the
// placed cards, so it rides `host: { filter, count }` (the BT21-071 object form) rather than the
// material filter. `[Kudamon]` is a bracketed printed name, so `match: "nameExact"`, not the
// substring `"name"` reading reserved for "w/[X] in its name".
//
// Both cards go under ONE Kudamon: the level-4 component binds the chosen host as `kudamonHost`
// and the level-5 component reads it back through `host.filter.boundRef`, the seam BT26-098 uses
// for the same "place A and B under one chosen host" sentence. The binding also names the
// permanent the digivolve below acts on — the printed "it".
const placeLevel4UnderKudamon: Cost = {
  kind: "place",
  target: { filter: holyBeastMaterial(4), count: 1, from: ["trash"] },
  destination: "digivolutionStack",
  position: "bottom",
  host: {
    filter: {
      controller: "mine",
      kind: ["Digimon"],
      zone: "battleArea",
      nameOrTrait: [{ tokens: ["Kudamon"], match: "nameExact" }],
    },
    count: 1,
  },
  bindHostAs: "kudamonHost",
  raw: "and placing 1 level 4 [Holy Beast] trait yellow Digimon card from your trash as 1 of your [Kudamon]'s digivolution cards",
};

const placeLevel5UnderKudamon: Cost = {
  kind: "place",
  target: { filter: holyBeastMaterial(5), count: 1, from: ["trash"] },
  destination: "digivolutionStack",
  position: "bottom",
  host: { filter: { boundRef: "kudamonHost" }, count: 1 },
  raw: "and placing 1 level 5 [Holy Beast] trait yellow Digimon card from your trash as that [Kudamon]'s digivolution card",
};

// "it may digivolve into [Kentaurosmon] in the hand or trash, ignoring level and with the cost
// reduced by 1."
//   - `fromSelectionRef` reuses the [Kudamon] the placement cost bound, so the Digimon that
//     digivolves is the one that received the cards — the printed "it". The whole clause is
//     therefore wrapped in a `CostGatedBlock`: that wrapper pays the activation cost ONCE and
//     only then runs its nested actions, which is what lets the nested digivolve see the
//     binding. (A `cost:` on the Digivolve itself cannot work: `canAttemptDigivolve` preflights
//     `action.target` BEFORE the cost is paid, and an unbound `fromSelectionRef` resolves to no
//     candidates, so the effect would never be offered.) BT26-097 prints the same
//     "by placing ... as any of your [X]'s bottom digivolution card, it may digivolve into [Y]
//     in the hand or trash" sentence and uses exactly this shape.
//   - `from: ["hand", "trash"]` is the printed "in the hand or trash".
//   - `payCost: true` + `reduceCost: 1`: the printed digivolution cost is still PAID, only
//     lowered by 1 (contrast "without paying the cost", which is `payCost: false`).
//   - `ignoreLevelRequirement: true` is the narrow "ignoring level" reading — the colour /
//     trait / name half of Kentaurosmon's requirement is still enforced, unlike the broader
//     `ignoreDigivolutionRequirements` used by cards printing "ignoring its digivolution
//     requirements" (BT18-070, BT26-097, EX10-032).
//   - `optional: true` is the printed "may".
const kudamonDigivolvesIntoKentaurosmon: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "compound",
    costs: [trashThreeFaceDown, placeLevel4UnderKudamon, placeLevel5UnderKudamon],
    raw: "By trashing 3 bottom face-down cards from under any of your Tamers and placing 1 each of level 4 and level 5 [Holy Beast] trait yellow Digimon cards from your trash as 1 of your [Kudamon]'s bottom digivolution cards",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Digivolve",
      target: { filter: {}, count: 1, fromSelectionRef: "kudamonHost" },
      into: {
        filter: {
          controller: "mine",
          zone: ["hand", "trash"],
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "nameExact" }],
        },
        count: 1,
      },
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 1,
      ignoreLevelRequirement: true,
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: startOfMainPhaseActions },
    { trigger: "StartOfYourMainPhase", actions: startOfMainPhaseActions },
    { trigger: "Main", frequency: "OncePerTurn", actions: [kudamonDigivolvesIntoKentaurosmon] },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-071", compiled);
