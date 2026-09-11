import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-053 Thundermon (Digimon, Black, Lv.4 Champion [Mutant], Data, play cost 4, DP 4000,
// digivolve: Black Lv.3 for 2 / Yellow Lv.3 for 2).
//
// Printed clauses:
//   [On Play] [On Deletion] You may return up to 3 Digimon cards with [Mamemon] in their texts
//     from your trash to the top of the deck. Then, delete 1 of your opponent's Digimon with a
//     play cost of 3 or less. For each one this effect returned, add 1 to this effect's play
//     cost maximum.
//   [Rule] Name: Treated as including [Mamemon].
//   Inherited: [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
//
// `node tools/kb/query.mjs card EX13-053` reports no knowledge-base entries — EX13 is
// pre-release — so the encoding is anchored on the printed catalog text and on the general
// rules in `data/kb/rules/comprehensive.md`: §4-22-1 (a token "in its text" means anywhere in
// the card's printed information), §16-12-1 (＜De-Digivolve＞), §15-7 (optional processing),
// and §2-3-1 / §4-22 (card names, which the [Rule] clause rewrites).
//
// Clause-by-clause:
//
// * The body is printed once under two timings with no [Once Per Turn], so it compiles to two
//   independent effect entries sharing one action list and carries no `sharedUseKey` — that
//   field only matters when a per-turn budget must be pooled across timings (BT21-029,
//   EX12-060). EX13-013 in this same set uses the same twin-entry layout.
//
// * "You may return up to 3 Digimon cards with [Mamemon] in their texts from your trash to the
//   top of the deck" is byte-for-byte BT8-065 CatchMamemon's shape, down to the `trackCount`:
//   a single `Return` with `from: ["trash"]`, `to: "deckTop"`, `count: 3` + `upTo: true` and
//   `optional: true`. Two deliberate divergences from BT8-065:
//     - the source zone is the trash ALONE (BT8-065 prints "hand and/or trash"), and
//     - the reference is "in their TEXTS", not "in their names", so `match: "text"` rather
//       than `match: "name"`. Under §4-22-1 that spans name ∪ traits ∪ every printed text
//       field, which is what lets EX13-046 Kokuwamon — whose only [Mamemon] mention sits
//       inside its printed effect text, with no name rewrite — be returned, while
//       `match: "name"` would leave it behind. (BT8-061 Thundermon does NOT discriminate the
//       two modes: `effectiveStaticNames` folds its printed "also treated as [Mamemon]" line
//       into the card's names, so a name filter already reaches it.)
//   `printedTextOnly` is deliberately NOT set: the candidates are loose trash cards with no
//   digivolution stack of their own, so the flag (which scopes a LIVE permanent's text match
//   to its own printed information) has nothing to narrow here.
//   `kind: ["Digimon"]` is load-bearing — BT8-106 Senbon Dokkān is an Option that names
//   [Mamemon] in its text and must not be returnable.
//   The clause prints no "in any order", so no `order: "any"`: BT8-065, which does print it,
//   is the card that would carry the field.
//
// * "Then, delete 1 of your opponent's Digimon with a play cost of 3 or less. For each one this
//   effect returned, add 1 to this effect's play cost maximum." is a MANDATORY `Delete`
//   (the "may" governs only the return sentence) whose ceiling is the printed base 3 raised by
//   the number of cards the return actually moved. That is `playCostLte: 3` plus
//   `playCostLteScaling` over `unit: "namedCount"` reading the return's `trackCount`
//   (`Filter.playCostLteScaling`: "the cap is `(playCostLte ?? 0) + scaleFactor`"). Counting a
//   live board filter instead would be wrong — nothing on the board records the return — and
//   `DeleteAction.playCostCeiling` cannot be used because its `unit` is narrowed to
//   `"cards" | "digivolutionCards"` and admits no context-sourced count.
//   The return is NOT encoded as a `by ...` cost and carries no `abortOnDecline`: §15-7-2's
//   "the processing after the conditions can't be executed" applies to optional processing
//   CONDITIONS ("by X, Y"), which this sentence is not. Declining, or having an empty trash,
//   still deletes — at the unraised maximum of 3, which is exactly what "for each one this
//   effect returned, add 1" describes when it returned none.
//
// * "[Rule] Name: Treated as including [Mamemon]." is the name-widening grant, identical to
//   the BT8-061 Thundermon and EX12-041 Thundermon printings of this same Digimon: a `Rule`
//   effect with `GrantStatic` `grant: "name"`, `tokens: ["Mamemon"]`, self-targeted. It widens
//   name matching (the only direction `matchNameOrTrait` supports), so a substring
//   `[Mamemon]`-name reference from another card — BT13-074's [All Turns] aura — reaches this
//   Digimon.
//
// * The inherited line is byte-identical to EX13-046's and BT20-073's, so it reuses their
//   accepted encoding: an `isInherited` `OnDeletion` effect with one `DeDigivolve`,
//   `amount: 1`, on 1 opponent Digimon. No "may", so mandatory.
//
// No `digivolutionRequirement`: the card prints no [Digivolve] clause, so both catalog
// evoCosts (Black Lv.3 for 2, Yellow Lv.3 for 2) are ordinary routes needing no IR entry.
const mamemonTextDigimonInTrash: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
};

const RETURNED_COUNT = "mamemonTextCardsReturned";

const returnThenDelete = (): Action[] => [
  {
    kind: "Return",
    target: {
      filter: mamemonTextDigimonInTrash,
      count: 3,
      upTo: true,
    },
    from: ["trash"],
    to: "deckTop",
    optional: true,
    trackCount: RETURNED_COUNT,
  },
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        playCostLte: 3,
        playCostLteScaling: { per: 1, unit: "namedCount", countSource: RETURNED_COUNT },
      },
      count: 1,
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: returnThenDelete() },
    { trigger: "OnDeletion", actions: returnThenDelete() },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Mamemon"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-053", compiled);
