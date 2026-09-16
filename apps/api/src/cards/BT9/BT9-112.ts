import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controllerDefault: "mine",
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 3,
              raw: "reduce its memory cost by 3",
            },
          ],
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play][When Digivolving] ＜De-Digivolve 1＞ all of your opponent’s Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 1,
        },
        {
          effectTextPart:
            "Then, delete all of your opponent’s level 4 or lower Digimon. [End of Opponent’s Turn][Once Per Turn] Delete all of your opponent's Digimon with the lowest play cost.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play][When Digivolving] ＜De-Digivolve 1＞ all of your opponent’s Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 1,
        },
        {
          effectTextPart:
            "Then, delete all of your opponent’s level 4 or lower Digimon. [End of Opponent’s Turn][Once Per Turn] Delete all of your opponent's Digimon with the lowest play cost.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: "all",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-112", compiled);
