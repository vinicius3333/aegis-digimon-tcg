import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may place 1 [Royal Base] trait Digimon card from your trash face up as your bottom security card.",
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
          effectTextPart:
            "Then, delete up to 8 play cost total worth of your opponent's Digimon. For each of your face up security cards, add 2 to the maximum play cost you may choose with this effect.",
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
