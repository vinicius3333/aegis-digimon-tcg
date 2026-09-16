import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RestrictEffect",
          restriction: "cannotPlaySameNameAsOwnDigimon",
          scope: "thisEffect",
          raw: "This effect can't play cards with the same names as any of your Digimon",
        },
        {
          kind: "Modal",
          optional: true,
          choose: 1,
          options: [
            [
              {
                kind: "PlayToken",
                tokens: [
                  {
                    name: "Atho, René & Por",
                    kind: "Digimon",
                    color: "White",
                    dp: 6000,
                    keywords: [
                      { keyword: "Reboot" },
                      { keyword: "Blocker" },
                      { keyword: "Decoy", colors: ["Red", "Black"] },
                    ],
                  },
                ],
                count: 1,
                payCost: false,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Sistermon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RestrictEffect",
          restriction: "cannotPlaySameNameAsOwnDigimon",
          scope: "thisEffect",
          raw: "This effect can't play cards with the same names as any of your Digimon",
        },
        {
          kind: "Modal",
          optional: true,
          choose: 1,
          options: [
            [
              {
                kind: "PlayToken",
                tokens: [
                  {
                    name: "Atho, René & Por",
                    kind: "Digimon",
                    color: "White",
                    dp: 6000,
                    keywords: [
                      { keyword: "Reboot" },
                      { keyword: "Blocker" },
                      { keyword: "Decoy", colors: ["Red", "Black"] },
                    ],
                  },
                ],
                count: 1,
                payCost: false,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Sistermon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Attack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["SaviorHuckmon"],
      level: 5,
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["CS"],
      level: 5,
      cost: 3,
      isAlternate: true,
    },
    {
      namesExact: ["Huckmon"],
      cost: 5,
      isAlternate: true,
      opponentDigimonDpMin: 10000,
    },
  ],
};

registerIrCard("BT23-013", compiled);
