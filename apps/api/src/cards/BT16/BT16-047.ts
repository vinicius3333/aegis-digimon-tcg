import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: {
                kind: "securityAtLeast",
                value: 3,
              },
            },
            {
              kind: "GainMemory",
              amount: 2,
              condition: {
                kind: "securityAtMost",
                value: 3,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Pulsemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-047", compiled);
export { compiled };
