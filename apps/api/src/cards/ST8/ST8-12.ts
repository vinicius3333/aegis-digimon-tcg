import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
            },
            count: 1,
            bindAs: "returnTarget",
          },
        },
        {
          kind: "TrashDigivolution",
          target: {
            fromSelectionRef: "returnTarget",
            filter: {},
            count: 1,
          },
          amount: 99,
        },
        {
          kind: "Return",
          target: {
            fromSelectionRef: "returnTarget",
            filter: {},
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST8-12", compiled);
