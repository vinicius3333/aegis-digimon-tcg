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
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Jellymon"],
                        match: "text",
                      },
                      {
                        tokens: ["DS"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [
                    {
                      tokens: ["Jellymon"],
                      match: "text",
                    },
                    {
                      tokens: ["DS"],
                      match: "trait",
                    },
                  ],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking] [Once Per Turn] ＜Draw 1＞.",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, if your hand has 7 or more cards, trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "handAtLeast",
            value: 7,
            raw: "your hand has 7 or more cards",
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
      names: ["Jellymon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-027", compiled);
