// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DNA Digivolve: [Slayerdramon] + [Breakdramon], unsuspended with both stacked.
// [On Play][When Digivolving] Suspend 1 opponent Digimon; it doesn't unsuspend next phase.
// [All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, you may:
//   • Suspend 1 of your opponent's Digimon, or
//   • Unsuspend 1 of your Digimon.
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
          duration: "untilOpponentTurnEnd",
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
          duration: "untilOpponentTurnEnd",
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
      cost: 4,
      materials: [
        {
          names: ["Slayerdramon"],
        },
        {
          names: ["Breakdramon"],
        },
      ],
    },
  ],
};

registerIrCard("BT13-059", compiled);
