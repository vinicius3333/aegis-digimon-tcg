// Hand-authored override — do not regenerate.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
                kind: "GainKeyword",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Xros Heart"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                keyword: {
                  keyword: "SecurityAttack",
                  amount: 1,
                  raw: "＜Security Attack +1＞",
                },
                duration: "forTheTurn",
              },
            ],
            [
              {
                kind: "Draw",
                controller: "mine",
                amount: 2,
              },
            ],
          ],
          optional: false,
          condition: {
            kind: "not",
            condition: {
              kind: "youHave",
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Shoutmon X5"],
                    match: "name",
                  },
                ],
              },
            },
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          optional: false,
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Shoutmon X5"],
                  match: "name",
                },
              ],
            },
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          optional: false,
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Shoutmon X5"],
                  match: "name",
                },
              ],
            },
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
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

registerIrCard("BT10-095", compiled);
