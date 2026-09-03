import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            unit: "cards",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            unit: "cards",
            levelCeilingAdd: 1,
          },
        },
      ],
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
                        colors: ["Blue"],
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                    to: "hand",
                    optional: true,
                  },
                ],
                [
                  {
                    kind: "PlayWithoutCost",
                    target: {
                      filter: {
                        levelComparison: { op: "lte", value: 4 },
                        colors: ["Blue"],
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                    fromOwnDigivolutionStack: true,
                    payCost: false,
                    optional: true,
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
          names: ["Lanamon"],
        },
        {
          names: ["Calmaramon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT18-029", compiled);
