// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const actions = [
  {
    kind: "Suspend",
    target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: false }, count: 1 },
    scaling: {
      per: 1,
      filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Green", "Black"] },
      unit: "cards",
    },
  },
  {
    kind: "Restrict",
    target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
    restriction: "unsuspend",
    duration: "untilOpponentTurnEnd",
  },
];
export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions },
    { trigger: "OnPlay", actions },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          // The printed subject is "this Digimon", not every allied attacker.
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-055", compiled);
