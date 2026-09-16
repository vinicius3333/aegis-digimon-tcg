import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          source: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          faceUp: true,
          optional: true,
        },
        {
          kind: "DeleteBudget",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          budget: 8,
          upTo: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
            budgetAdd: 2,
          },
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

registerIrCard("BT19-096", compiled);
