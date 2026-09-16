import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-025 Candlemon (Digimon, Yellow, Lv.3 Rookie [Flame], Data, 2000 DP, play cost 3,
// printed EvoCost Yellow Lv.2 for 0).
//
// Printed main text:
//   [Start of Your Main Phase] If you have 3 or more security cards, trash your top or bottom
//     security card, ＜Draw 1＞ and gain 1 memory. Then, if you have 2 or fewer security cards,
//     you may place 1 card with [Witchelny] in its text from your hand as the bottom security
//     card.
//   [Rule] Trait: Has [Witchelny] Type.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When this Digimon with [Dynasmon] or [Witchelny] in its text
//     would leave the battle area by your opponent's effects, by trashing your top security card,
//     it doesn't leave.
// No printed security text and no printed [Digivolve] header, so there is no
// `digivolutionRequirement`.
//
// KB: `node tools/kb/query.mjs card EX13-025` reports no entries — EX13 is pre-release. General
// rules consulted: comprehensive §4-22-1 (a "[X] in its text" reference is the name ∪ traits ∪
// printed-text union) and manual §1 [X Per Turn] (a "by" condition is all-or-nothing: an empty
// security stack makes the whole replacement clause unavailable rather than free).
//
// MAIN CLAUSE. The printed "If you have 3 or more security cards" gates the WHOLE first sentence,
// and the sentence's first process REMOVES a security card. Putting a per-action
// `condition: { zoneCount ... gte 3 }` on each of the three processes would therefore re-read the
// stack after the trash and silently drop the draw and the memory gain whenever the stack started
// at exactly 3. The gate is consequently one `ConditionalBranch` evaluated ONCE, before any
// process runs, with the three processes as its `ifTrue` list.
//
// "trash your top or bottom security card" is an EFFECT process here, not a "by" cost (contrast
// AD1-017 and BT25-040, which print the same words as a payment), so it is a
// `SecurityManipulation` with `op: "trashTop"` and `chooseTopOrBottom: true` — the flag that
// widens the single trashed card from the top to the controller's pick of either end (BT16-056).
//
// "Then, if you have 2 or fewer security cards" reads the stack AFTER the trash and the draw, so
// it is an ordinary `ActionBase.condition` on the fourth process and stays inside the outer
// branch (the "Then" chains off the gated sentence, so a stack that started below 3 reaches
// neither half). "you may place 1 card ... from your hand as the bottom security card" is
// `op: "addBottom"` with a `source` Target over the hand — the BT19-036 / BT21-024 shape — and
// `optional: true` for the printed "may". The placed card goes face down; nothing in the printed
// sentence reveals it, so no `revealChosen`/`faceUp`.
//
// The hand filter carries NO card-kind restriction, because the printed sentence says "1 card",
// not "1 Digimon card". `match: "text"` is the §4-22-1 union reading, which is what lets a
// [Witchelny]-TYPE card and a card that merely mentions [Witchelny] in a printed sentence both
// qualify.
//
// [Rule] Trait is the EX13-038 / EX12-026 shape: a `Rule`-trigger `GrantStatic` with
// `grant: "trait"` on `isSelfRef`. Declarative rather than load-bearing — `staticTraitsOf`
// already parses "[Rule] Trait: Has [X] Type" straight out of the printed `effectText` — but kept
// so the IR record of the printed clause is complete, as the peer cards in this set do.
//
// INHERITED CLAUSE. "would leave the battle area BY YOUR OPPONENT'S EFFECTS" is narrower than the
// "other than by your effects" wording used elsewhere in this set (EX13-015, EX13-027): it covers
// only opposing effects, so battle deletion and the controller's own effects are untouched. That
// is `leaveCause: "opponentEffect"`, exactly as BT19-036 encodes the same sentence.
// `sourceFilter: { isSelfRef: true }` is the printed "THIS Digimon" (KB Q3092 — the replacement
// guards only the permanent carrying this card, not every matching Digimon), and the trailing
// "with [Dynasmon] or [Witchelny] in its text" narrows that same permanent: the inherited clause
// does nothing on a host that does not read as [Dynasmon] or [Witchelny]. Both tokens live in ONE
// `nameOrTrait` entry because `tokens` is an OR-list. The printed [Once Per Turn] is the effect's
// `frequency`, and the payment is the generic top-security `trash` cost with `actions: []` (the
// whole effect of a `mode`-less prevention replacement is that the permanent stays).
const ownTopSecurity = {
  filter: { controller: "mine", zone: "security", position: "top" },
  count: 1,
} as const;

const trashTopOrBottomSecurity: Action = {
  kind: "SecurityManipulation",
  op: "trashTop",
  controller: "mine",
  amount: 1,
  chooseTopOrBottom: true,
  raw: "trash your top or bottom security card",
};

const placeWitchelnyTextCardAsBottomSecurity: Action = {
  kind: "SecurityManipulation",
  op: "addBottom",
  controller: "mine",
  amount: 1,
  source: {
    filter: {
      controller: "mine",
      zone: "hand",
      nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
    },
    count: 1,
  },
  optional: true,
  condition: {
    kind: "zoneCount",
    seat: "mine",
    zone: "security",
    op: "lte",
    value: 2,
    raw: "you have 2 or fewer security cards",
  },
  raw: "you may place 1 card with [Witchelny] in its text from your hand as the bottom security card",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "gte",
            value: 3,
            raw: "you have 3 or more security cards",
          },
          ifTrue: [
            trashTopOrBottomSecurity,
            { kind: "Draw", controller: "mine", amount: 1, raw: "＜Draw 1＞" },
            { kind: "GainMemory", amount: 1, raw: "gain 1 memory" },
            placeWitchelnyTextCardAsBottomSecurity,
          ],
          raw: "If you have 3 or more security cards, trash your top or bottom security card, ＜Draw 1＞ and gain 1 memory",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Witchelny"],
          raw: "[Rule] Trait: Has [Witchelny] Type.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            // CR 4-23-2: a Digimon's TEXT is the information printed on its TOP card. The
            // inherited effects its digivolution cards confer are effects it gains, not text it
            // gains. Without this flag the clause reads its own [Witchelny]-mentioning Candlemon
            // card out of the stack and protects every host unconditionally — mutation-confirmed:
            // dropping it turns the "does not protect a host without [Dynasmon] or [Witchelny]"
            // test green-to-red.
            printedTextOnly: true,
            nameOrTrait: [{ tokens: ["Dynasmon", "Witchelny"], match: "text" }],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: ownTopSecurity,
            raw: "by trashing your top security card",
          },
          raw: "When this Digimon with [Dynasmon] or [Witchelny] in its text would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-025", compiled);
