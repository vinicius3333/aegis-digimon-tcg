// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT23-013 (Jesmon).
// [When Digivolving][When Attacking]: Modal choice between playing [Atho/René/Por] Token or
//   a [Sistermon]-name card from hand/trash. Restriction is effect-scoped (not permanent).
// [Your Turn]: SubTrigger whenPlayed (another Digimon), then this Digimon may attack
//   — text says "may attack" (normal attack with suspending). Q5223 confirms attack IS
//   declared normally.
// digivolutionRequirement: SaviorHuckmon level 5 or CS trait level 5, cost 3.
//   Also: Huckmon cost 5 but only while opponent has ≥10000 DP Digimon (conditional reqs).
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
          options: [
            [
              {
                kind: "PlayToken",
                token: {
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
          options: [
            [
              {
                kind: "PlayToken",
                token: {
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
      names: ["SaviorHuckmon"],
      traits: ["CS"],
      level: 5,
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Huckmon"],
      cost: 5,
      isAlternate: true,
      condition: {
        kind: "opponentHas",
        filter: {
          controllerDefault: "opponent",
          kind: ["Digimon"],
          dp: {
            op: "gte",
            value: 10000,
          },
        },
        raw: "while opponent has a 10000 DP or higher Digimon",
      },
    },
  ],
};

registerIrCard("BT23-013", compiled);
