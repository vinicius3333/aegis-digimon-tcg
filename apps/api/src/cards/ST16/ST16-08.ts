import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gabumon"],
                  match: "nameExact",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["Matt Ishida"],
                    match: "name",
                  },
                ],
              },
            ],
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] ＜Draw 1＞. (Draw 1 card from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking][Once Per Turn] ＜Draw 1＞. (Draw 1 card from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Gabumon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST16-08", compiled);
