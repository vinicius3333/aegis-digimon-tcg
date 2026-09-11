import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-015 Gallantmon (Red Lv.6 Mega, [Holy Warrior]/[Royal Knight], Virus, 12000 DP,
// play cost 12, printed EvoCost: Red Lv.5 for 3).
//
// Printed clauses:
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Guilmon]/[Growlmon] in name
//   ＜Raid＞ ＜Progress＞ ＜Blocker＞
//   [On Play] [When Digivolving] [When Attacking] [Counter] [Once Per Turn] Delete 1 of your
//     opponent's 12000 DP or higher Digimon. If this effect didn't delete, trash their top
//     security card.
//   [All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your
//     effects, by deleting 1 of your opponent's 9000 DP or lower Digimon, it doesn't leave.
// No inherited effect and no security effect are printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §7-3 Assembly: materials come from the TRASH only, the exact slot count must be placed, and
//     the leftmost printed slot ends up closest to the played card. The three printed slots are
//     disjoint by level, so the engine's greedy per-slot partition
//     (`materialsSatisfyAssemblyRecipe`) assigns them unambiguously in any declaration order.
//   - §11-3 Counter Timing: a [Counter] effect is activated by the DEFENDING seat inside the open
//     counter window, which is why the fourth copy of the body carries `trigger: "Counter"`.
//   - §16-44 / §16-36 keyword semantics: ＜Raid＞ redirects the declared attack onto the
//     opponent's highest-DP unsuspended Digimon at declaration, ＜Progress＞ makes the attacker
//     unaffected by opponent effects while it attacks, ＜Blocker＞ is the printed block window.
//     All three are read from printed text by `combat/keywords.ts`; the `Static` entry keeps the
//     IR record complete, matching BT26-029 and EX12-060.
//
// "w/[Guilmon]/[Growlmon] in name" says "in name", so the Assembly slots use substring `names`
// (§4-22-1 / the brief's naming rule), which is what makes a Lv.5 WarGrowlmon — "Growlmon" as a
// substring — a legal top slot.
//
// One printed [Once Per Turn] governs all four timings of the delete clause, so every window
// carries the same `sharedUseKey`, the EX12-017 / EX13-012 shape. "If this effect didn't delete"
// is `ifThisEffectDidNotDelete` over a MANDATORY `Delete` (EX13-013, BT19-015): a chosen but
// undeletable target still counts as "didn't delete". "Their top security card" is
// `SecurityManipulation` `trashTop` on the opponent.
//
// The leave clause is a `wouldLeavePlay` Replacement with `leaveCause: "otherThanYourEffect"`
// (AD1-003, EX12-003) and a `deleteOwn` cost whose target is the OPPONENT's board — `deleteOwn`
// is the engine's generic "delete as a cost" primitive and honours the cost target's
// `controller` (BT24-018 pays it from the opponent's side too). A Replacement whose cost is
// present with no payload actions resolves as `mode: "prevent"` (EX11-027); it is stated
// explicitly here. The printed [Once Per Turn] on a continuous watcher is the
// `oncePerTurnKey` budget (BT26-029, EX10-058), keyed per source instance by the interpreter.
const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

const deleteBigOrBurnSecurity = (): Action[] => [
  {
    kind: "Delete",
    target: {
      filter: { ...opponentDigimon, dp: { op: "gte", value: 12_000 } },
      count: 1,
    },
    raw: "Delete 1 of your opponent's 12000 DP or higher Digimon",
  },
  {
    kind: "SecurityManipulation",
    op: "trashTop",
    controller: "opponent",
    condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
    raw: "If this effect didn't delete, trash their top security card",
  },
];

const SHARED_USE_KEY = "ir-shared-0";

const compiled: CompiledCard = {
  cardId: "EX13-015",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Progress", raw: "＜Progress＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: deleteBigOrBurnSecurity(),
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: deleteBigOrBurnSecurity(),
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: deleteBigOrBurnSecurity(),
    },
    {
      trigger: "Counter",
      frequency: "OncePerTurn",
      sharedUseKey: SHARED_USE_KEY,
      actions: deleteBigOrBurnSecurity(),
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          oncePerTurnKey: "EX13-015/leave-prevention",
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: { ...opponentDigimon, dp: { op: "lte", value: 9000 } },
              count: 1,
            },
            raw: "by deleting 1 of your opponent's 9000 DP or lower Digimon",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 of your opponent's 9000 DP or lower Digimon, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // Printed "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Guilmon]/[Growlmon] in name": three
  // single-card slots, leftmost first, each anchored by the substring name family.
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { count: 1, level: 5, names: ["Guilmon", "Growlmon"] },
        { count: 1, level: 4, names: ["Guilmon", "Growlmon"] },
        { count: 1, level: 3, names: ["Guilmon", "Growlmon"] },
      ],
    },
  ],
};

export { compiled };

registerIrCard("EX13-015", compiled);
