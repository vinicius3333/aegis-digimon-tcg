import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Bagra Army"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
              optional: true,
            },
          ],
          rest: "trash",
        },
        {
          effectTextPart:
            "Then, you may place 1 Digimon card with [Bagra Army] in its traits from your trash under one of your Tamers.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 [Yuu Amano] from your hand or trash without paying its memory cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Yuu Amano"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-107", compiled);
