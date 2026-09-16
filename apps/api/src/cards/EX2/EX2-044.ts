import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Impmon"],
                      match: "nameExact",
                    },
                  ],
                  zone: "trash",
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
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3 or lower Digimon. For every 10 cards in your trash, add 1 to the maximum level of the Digimon you can choose with this effect.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              controller: "mine",
            },
            unit: "trash",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3 or lower Digimon. For every 10 cards in your trash, add 1 to the maximum level of the Digimon you can choose with this effect.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              controller: "mine",
            },
            unit: "trash",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-044", compiled);
