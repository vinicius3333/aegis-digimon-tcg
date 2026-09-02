import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
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
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Modal",
              choose: 1,
              optional: true,
              options: [
                [
                  {
                    kind: "Return",
                    target: {
                      filter: {
                        controller: "mine",
                        zone: "digivolutionCards",
                        hostFilter: { isSelfRef: true },
                        levelComparison: { op: "lte", value: 4 },
                        colors: ["Green"],
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                    to: "hand",
                  },
                ],
                [
                  {
                    kind: "PlayWithoutCost",
                    target: {
                      filter: {
                        levelComparison: { op: "lte", value: 4 },
                        colors: ["Green"],
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                    fromOwnDigivolutionStack: true,
                    payCost: false,
                  },
                ],
              ],
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Arbormon"],
        },
        {
          names: ["Petaldramon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT18-055", compiled);
