import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              colors: ["Blue"],
              hostFilter: {
                isSelfRef: true,
              },
            },
            count: 1,
            source: "digivolutionCards",
          },
          from: ["digivolutionCards"],
          payCost: false,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              colors: ["Green"],
              hostFilter: {
                isSelfRef: true,
              },
            },
            count: 1,
            source: "digivolutionCards",
          },
          from: ["digivolutionCards"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST9-06", compiled);
