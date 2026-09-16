import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-029 FlameWizardmon (Digimon, Yellow/Red, Lv.4 Armor Form [Wizard]/[Witchelny], Virus,
// 5000 DP, play cost 5, printed EvoCosts Yellow Lv.3 for 3 and Red Lv.3 for 3).
//
// Printed main text:
//   [Digivolve] Lv.3 w/[Witchelny] in text: Cost 2
//   ＜Armor Purge＞
//   [When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card, 1 of
//     your opponent's Digimon gets -4000 DP for the turn. After, if you have 3 or fewer security
//     cards, delete 1 of your opponent's Digimon with 4000 DP or less.
//   [Rule] Name: Also treated as [Wizardmon].
// Printed inherited text:
//   [All Turns] [Once Per Turn] When this Digimon with [Dynasmon] or [Witchelny] in its text
//     would leave the battle area by your opponent's effects, by trashing your top security card,
//     it doesn't leave.
//
// KB: `node tools/kb/query.mjs card EX13-029` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §16-19 ＜Armor Purge＞: an immediate-type deletion prevention paid by trashing
//     THIS Digimon's own top stacked card. Engine-resident (the keyword needs no IR actions), and
//     deliberately distinct from ＜Barrier＞ (§16-25), which pays from the security stack and only
//     answers BATTLE deletion.
//   - comprehensive §4-22-1: "[X] in text" reads name ∪ traits ∪ printed text as one union.
//
// The alternate [Digivolve] header is a `digivolutionRequirement`, not an effect. It widens the
// catalog EvoCosts twice over: the cost drops 3 → 2, and the source predicate becomes ANY colour
// Lv.3 whose TEXT mentions [Witchelny] (`texts`, the EX12-014 / EX12-030 "w/[X] in text" field),
// where the catalog EvoCosts need a Yellow or Red Lv.3 regardless of text. A green Lv.3 Candlemon
// relative therefore reaches this card for 2.
//
// The two printed timings share ONE [Once Per Turn], so both windows carry the same
// `sharedUseKey`: a when-digivolving activation spends the when-attacking activation too
// (EX13-020, EX13-042). A plain `frequency` on each window would wrongly allow one use per timing.
//
// "By trashing your top security card, 1 of your opponent's Digimon gets -4000 DP for the turn"
// carries no "may", so the `ModifyDP` is MANDATORY with a `cost` — no `optional`. An empty
// security stack makes the cost unpayable, and manual §1 forbids paying a "by" condition partly,
// so the whole clause then does nothing. `duration: "forTheTurn"` is the printed "for the turn"
// (not `untilOpponentTurnEnd`, which is the differently worded "until their turn ends").
//
// "After, if you have 3 or fewer security cards, delete ..." reads the stack AFTER the cost has
// been paid, which is precisely what an `ActionBase.condition` on the FOLLOWING action does: it
// is evaluated when that action runs, so the security card just spent is already gone and a
// four-card stack correctly satisfies the gate. The delete is mandatory ("delete", no "may") and
// `dp: { op: "lte", value: 4000 }` is the printed live-DP ceiling (EX13-010's identical phrase),
// which the -4000 from the preceding process can itself bring a target under.
//
// [Rule] Name is the BT15-035 / BT18-088 shape: a `Rule`-trigger `GrantStatic` with
// `grant: "name"`. It is load-bearing here rather than decorative — it is what makes this card
// answer the many "[Wizardmon] in its name" references in the Witchelny family.
//
// The inherited clause is the same printed sentence as EX13-025's, encoded identically:
// `leaveCause: "opponentEffect"` for the narrow "by your opponent's effects" wording (BT19-036),
// `sourceFilter: { isSelfRef: true }` for the printed "THIS Digimon" (KB Q3092) narrowed by the
// [Dynasmon]/[Witchelny] text union, the printed [Once Per Turn] as the effect's `frequency`, and
// the top-security `trash` cost with `actions: []` — a prevention replacement's whole effect is
// that the permanent stays.
const SHARED_USE_KEY = "EX13-029/security-debuff";

const ownTopSecurity = {
  filter: { controller: "mine", zone: "security", position: "top" },
  count: 1,
} as const;

const debuffOpponentDigimon: Action = {
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: -4000,
  duration: "forTheTurn",
  cost: {
    kind: "trash",
    target: ownTopSecurity,
    raw: "By trashing your top security card",
  },
  raw: "By trashing your top security card, 1 of your opponent's Digimon gets -4000 DP for the turn",
};

const deleteSmallOpponentDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
    count: 1,
  },
  condition: {
    kind: "zoneCount",
    seat: "mine",
    zone: "security",
    op: "lte",
    value: 3,
    raw: "you have 3 or fewer security cards",
  },
  raw: "After, if you have 3 or fewer security cards, delete 1 of your opponent's Digimon with 4000 DP or less",
};

const debuffWindow = (trigger: "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: SHARED_USE_KEY,
  actions: [debuffOpponentDigimon, deleteSmallOpponentDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    },
    debuffWindow("WhenDigivolving"),
    debuffWindow("WhenAttacking"),
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Wizardmon"],
          raw: "[Rule] Name: Also treated as [Wizardmon].",
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
            // CR 4-23-2: a Digimon's TEXT is the information printed on its TOP card, so the
            // inherited effects its digivolution cards confer do not qualify it. This card's own
            // printed [Witchelny] type satisfies the gate while it is the top card, and the flag
            // keeps the clause from protecting an unrelated host that merely carries it.
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
  digivolutionRequirement: [{ level: 3, texts: ["Witchelny"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-029", compiled);
