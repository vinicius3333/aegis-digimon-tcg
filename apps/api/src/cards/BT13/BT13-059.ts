import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
      ],
    },
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Modal",
              choose: 1,
              options: [
                [
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
                ],
                [
                  {
                    kind: "Unsuspend",
                    target: {
                      filter: {
                        controller: "mine",
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                  },
                ],
              ],
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Green",
          level: 6,
        },
        {
          color: "Blue",
          level: 6,
        },
      ],
    },
  ],
};

registerIrCard("BT13-059", compiled);
