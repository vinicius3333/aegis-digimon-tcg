// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4161: when the two-low-DP branch is available, its controller may select
// either one or two of those Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Suspend 1 of your opponent's Digimon", "Suspend 1 or 2 opponent Digimon with 5000 DP or less"],
          options: [
            [
              {
                kind: "Suspend",
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"] },
                  count: 1,
                },
              },
            ],
            [
              {
                kind: "Suspend",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    dp: { op: "lte", value: 5000 },
                  },
                  count: 2,
                  upTo: true,
                  minimum: 1,
                },
              },
            ],
          ],
          optionConditions: [
            null,
            {
              kind: "opponentHas",
              filter: {
                zone: "battleArea",
                controllerDefault: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 5000 },
              },
              count: 2,
              raw: "your opponent has 2 Digimon with 5000 DP or less",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-044", compiled);
