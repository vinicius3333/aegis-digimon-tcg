import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-062 Craniamon (Black Lv.6 Mega, [Holy Warrior]/[Royal Knight], Vaccine, 12000 DP,
// play cost 12, printed EvoCost: Black Lv.5 for 3). SR.
//
// Printed main text:
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all Black w/＜Blocker＞
//   ＜Reboot＞
//   ＜Blocker＞
//   [On Play] [When Digivolving] Your opponent's effects don't affect this Digimon until their
//     turn ends.
//   [All Turns] [Once Per Turn] When this Digimon suspends, you may delete all of your
//     opponent's Digimon with the lowest play cost.
//   [All Turns] When this Digimon unsuspends, it gets +3000 DP until your turn ends.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-062` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-1 / §7-3-2-4 / §7-3-2-6 Assembly: materials come from the TRASH only, the exact
//     slot count must be placed (no partial Assembly), the reduction is the flat printed amount,
//     and the leftmost printed slot ends up closest to the played card.
//   - §16-4 (＜Blocker＞) and §16-11 (＜Reboot＞) are engine-resident keywords; the IR declares them.
//   - §9-4 "don't affect" is the unaffected/immunity wording: the permanent can neither be chosen
//     by nor affected by the named class of effects.
//   - §15-14 once-per-turn budgets are per source instance and reset at the start of each turn.
//
// This card is the Lv.6 sibling of BT23-058 Craniamon, which prints the same ＜Reboot＞ ＜Blocker＞
// pair and the same suspend sweep (there MANDATORY: "delete all ...", here OPTIONAL: "you may
// delete all ..."), so the suspend clause reuses BT23-058's exact encoding plus `optional: true`.
//
// [Assembly -5] "Lv.5 × Lv.4 × Lv.3, all Black w/＜Blocker＞" is three ordered single-card slots
// (EX13-015 / EX13-014 shape), each carrying BOTH printed predicates:
//   - `colors: ["Black"]` — the OR-matched printed-colour gate (a mono-Black card qualifies, and
//     so would a multicolour card printing Black).
//   - `nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }]` — the printed keyword gate.
//     `AssemblyMaterial` has no `keywords` field, but `matchNameOrTrait` routes a bracketed
//     keyword token through `textPrintsKeyword`, which is delimiter-anchored (＜Blocker＞ matches,
//     a card merely NAMED "Blockmon" or printing ＜Material Save＞ does not). This is the same slot
//     shape EX11-045 uses for its black text-token materials, and it also satisfies
//     `materialMatchesAssemblySlot`'s hard requirement that every slot carry a name/trait/text
//     anchor — a colour-plus-level slot alone is rejected as unenforceable.
//   Known over-read, shared with every other printed-text keyword predicate in the engine
//   (REVIEW-NOTES): `textPrintsKeyword` scans effectText AND inheritedEffectText, so a trash card
//   whose ＜Blocker＞ is only INHERITED would also qualify. That is engine-wide behaviour, not a
//   per-card choice, and no EX13 material fixture exercises it.
//
// The immunity clause says "Your opponent's effects" with no card-kind narrowing, so it is
// `GrantImmunity` with `immuneFrom: "opponentEffects"` (EX10-021 / EX11-046 shape), NOT EX13-061's
// `Restrict` + `fromSourceKind: ["Digimon"]`, which would wrongly let opposing Options and Tamers
// through. "until their turn ends" is the opponent's turn end: `untilOpponentTurnEnd`.
// The two printed timings share one line with no [Once Per Turn], so each window is its own effect
// with neither `frequency` nor `sharedUseKey`.
//
// The suspend sweep is a resident `AllTurns` `SubTrigger` on `whenSuspended` with
// `sourceFilter: { isSelfRef: true }` — the only predicate in that filter, which matters because
// the interpreter's dedicated `whenSuspendedSelfGate` compares suspended-permanent ids to the
// anchor and ignores any other `sourceFilter` predicate (REVIEW-NOTES). The printed [Once Per Turn]
// sits on the printed line that owns the watcher, so it is the effect-level `frequency` budget
// (BT23-058). "all of your opponent's Digimon with the lowest play cost" is
// `superlative: "lowestPlayCost"` with `count: "all"`: ties are all deleted, and the superlative is
// resolved over the eligible pool only, which the `kind: ["Digimon"]` + `controller: "opponent"`
// filter already restricts to the battle area (breeding is excluded).
//
// The unsuspend clause carries no [Once Per Turn], so it fires on every unsuspension — including
// the extra one ＜Reboot＞ grants during the opponent's unsuspend phase. "until your turn ends" is
// the CONTROLLER's turn end (`untilYourTurnEnd`), so a Reboot-driven boost on the opponent's turn
// survives into the controller's own turn and expires at its end.
const opponentLowestPlayCostDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
    count: "all",
  },
  optional: true,
  raw: "you may delete all of your opponent's Digimon with the lowest play cost",
};

const immuneToOpponentEffects: Action = {
  kind: "GrantImmunity",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  immuneFrom: "opponentEffects",
  duration: "untilOpponentTurnEnd",
  raw: "Your opponent's effects don't affect this Digimon until their turn ends",
};

const immunityWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [immuneToOpponentEffects],
});

const compiled: CompiledCard = {
  cardId: "EX13-062",
  effects: [
    {
      // `effect.ts` turns a `Static` `keywords` entry into a self-targeted `GainKeyword` recorded
      // in the continuous ledger, and combat legality (`hasBlocker` in `combat/legality.ts`) reads
      // that ledger BEFORE falling back to regex-parsing the printed text. The entry is
      // load-bearing per REVIEW-NOTES' correction; it is never redundant with printed text.
      // Mutation-tested on THIS card: emptying `keywords` leaves every behavioural keyword test
      // green, because the regex fallback parses this card's printed "＜Reboot＞" / "＜Blocker＞"
      // lines correctly. That is card-specific and does not generalize, so the entry stays.
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    immunityWindow("OnPlay"),
    immunityWindow("WhenDigivolving"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [opponentLowestPlayCostDigimon],
          raw: "When this Digimon suspends, you may delete all of your opponent's Digimon with the lowest play cost",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilYourTurnEnd",
              raw: "it gets +3000 DP until your turn ends",
            },
          ],
          raw: "When this Digimon unsuspends, it gets +3000 DP until your turn ends",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { count: 1, level: 5, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
        { count: 1, level: 4, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
        { count: 1, level: 3, colors: ["Black"], nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }] },
      ],
    },
  ],
};

export { compiled };

registerIrCard("EX13-062", compiled);
