import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const actions: Action[] = [
  {
    kind: "Suspend",
    effectTextPart:
      "[When Digivolving][On Play] For each green or black Tamer you have in play, suspend 1 of your opponent's Digimon.",
    target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: false }, count: 1 },
    scaling: {
      per: 1,
      filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Green", "Black"] },
      unit: "cards",
    },
  },
  {
    kind: "Restrict",
    effectTextPart:
      "Then, 1 of your opponent's suspended Digimon can't unsuspend during your opponent's next unsuspend phase.",
    target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
    restriction: "unsuspendDuringOwnUnsuspendPhase",
    duration: "untilOpponentNextUnsuspendPhase",
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
