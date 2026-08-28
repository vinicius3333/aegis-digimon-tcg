import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Delete",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 4 },
                  },
                  count: 1,
                },
                raw: "Delete 1 opponent's level 4 or lower Digimon",
              },
            ],
            [
              {
                kind: "Delete",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 6 },
                  },
                  count: 1,
                },
                cost: {
                  kind: "deleteOwn",
                  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                  raw: "By deleting 1 of your Digimon",
                },
                raw: "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
              },
            ],
          ],
          optionConditions: [
            {
              kind: "opponentHas",
              filter: {
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
              },
            },
            {
              kind: "allOf",
              conditions: [
                { kind: "youHave", filter: { kind: ["Digimon"] } },
                {
                  kind: "opponentHas",
                  filter: {
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 6 },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-072", compiled);
