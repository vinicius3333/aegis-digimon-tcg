import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          effectTextPart: "[Main] Return 1 of your opponent’s level 4 or lower Digimon to its owner’s hand.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "Return",
          effectTextPart:
            "Then, if you have a Digimon with [Jellymon] in its name or with [Jellymon] in its digivolution cards, return 1 of your opponent’s Tamers to its owner’s hand.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Jellymon"], match: "name" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  digivolutionStackNameOrTrait: [{ tokens: ["Jellymon"], match: "nameExact" }],
                },
              },
            ],
            raw: "you have a Digimon with [Jellymon] in its name or with [Jellymon] in its digivolution cards",
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

registerIrCard("BT9-096", compiled);
