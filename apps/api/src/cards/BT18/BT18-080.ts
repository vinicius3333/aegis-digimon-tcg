import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 level 4 or lower red, green, purple or white Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              colors: ["Red", "Green", "White", "Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, delete 1 blue, yellow, black or white Tamer with a play cost of 3 or less.",
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Tamer"],
              colors: ["Blue", "Yellow", "White", "Black"],
              playCostLte: 3,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 level 4 or lower red, green, purple or white Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              colors: ["Red", "Green", "White", "Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, delete 1 blue, yellow, black or white Tamer with a play cost of 3 or less.",
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Tamer"],
              colors: ["Blue", "Yellow", "White", "Black"],
              playCostLte: 3,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-080", compiled);
