import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Trash 1 card from the top of both players' security stacks.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "any",
          bothPlayers: true,
          amount: 1,
        },
        {
          effectTextPart:
            "Then, you may play 1 purple or yellow Digimon card with a level of 4 or less from your trash without paying its memory cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-090", compiled);
