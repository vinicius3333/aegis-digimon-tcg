import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
