import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-013 WarGrowlmon (Red Lv.5 Ultimate, [Cyborg]/Virus, 8000 DP, play cost 8,
// digivolve: Red Lv.4 for 3).
//
// Printed clauses:
//   ＜Engage＞
//   [When Digivolving] [When Attacking] Delete 1 of your opponent's Digimon with 5000 DP or
//     less. If this effect didn't delete, this Digimon gains ＜Piercing＞ and +3000 DP for the
//     turn.
//   [End of Attack] [On Deletion] You may play 1 Tamer card with [Guilmon] in its text from
//     your hand or trash without paying the cost.
//   Inherited: [All Turns] [Once Per Turn] When any of your opponent's Digimon are deleted, if
//     this Digimon has [Gallantmon] in its name, trash their top security card.
//
// No KB rulings exist for this card (EX13 is pre-release). Comprehensive rules consulted:
// 16-44 ＜Engage＞ ("may attack at the end of your turn", a trigger-type effect at End of Your
// Turn, optional), which is why the keyword is a `Static` marker plus an `EndOfYourTurn`
// optional self-`Attack` — the encoding EX12-019, EX12-060 and 20 other cards already use.
//
// "Delete 1 ... with 5000 DP or less. If this effect didn't delete, ..." is BT19-015's exact
// sentence shape: a MANDATORY `Delete` (no `optional`, so Q3070's "delete if you can" holds and
// Q3071's chosen-but-undeletable target still counts as "didn't delete") followed by two actions
// carrying `condition: ifThisEffectDidNotDelete`. The only divergence from BT19-015 is the
// printed duration: "for the turn" is `forTheTurn`, not BT19-015's `untilOpponentTurnEnd`.
//
// The same body is printed under two timings with no [Once Per Turn], so the two effects are
// independent entries and carry no `sharedUseKey` — that field only matters when a per-turn
// limit must be pooled across timings (BT21-029, EX12-060).
//
// "1 Tamer card with [Guilmon] in its text" is comprehensive rules §4-22-1: the token anywhere
// in the printed information, which the engine models as `match: "text"` (name ∪ traits ∪ every
// printed text field, KB Q4574 via BT21-066). The `kind: ["Tamer"]` gate is load-bearing — the
// Digimon named Guilmon (EX13-007) answers the text reference but is not a Tamer card.
// `from: ["hand", "trash"]` with `payCost: false` is the BT26-073 / BT21-066 play-for-free shape.
//
// The inherited clause watches the opponent's seat through `onDeletionOf` (BT21-029, BT19-015),
// and "if this Digimon has [Gallantmon] in its name" is the substring self-check
// `selfHasNameContaining` — the host, not this card, so a plain WarGrowlmon host never fires.
// "their top security card" is `SecurityManipulation` `trashTop` on the opponent (ST22-06).
const guilmonTamer: Filter = {
  controller: "mine",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Guilmon"], match: "text" }],
};

const deleteOrBuff = (): Action[] => [
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        dp: { op: "lte", value: 5000 },
      },
      count: 1,
    },
  },
  {
    kind: "GainKeyword",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
    duration: "forTheTurn",
    condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
  },
  {
    kind: "ModifyDP",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    amount: 3000,
    duration: "forTheTurn",
    condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
  },
];

const playGuilmonTamer = (): Action => ({
  kind: "PlayWithoutCost",
  target: { filter: guilmonTamer, count: 1 },
  from: ["hand", "trash"],
  payCost: false,
  optional: true,
});

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Engage", raw: "＜Engage＞" }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
        },
      ],
    },
    { trigger: "WhenDigivolving", actions: deleteOrBuff() },
    { trigger: "WhenAttacking", actions: deleteOrBuff() },
    { trigger: "EndOfAttack", actions: [playGuilmonTamer()] },
    { trigger: "OnDeletion", actions: [playGuilmonTamer()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              condition: {
                kind: "selfHasNameContaining",
                names: ["Gallantmon"],
                raw: "this Digimon has [Gallantmon] in its name",
              },
            },
          ],
          raw: "When any of your opponent's Digimon are deleted, if this Digimon has [Gallantmon] in its name, trash their top security card",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-013", compiled);
