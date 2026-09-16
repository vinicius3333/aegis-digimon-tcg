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
          chooseAll: {
            condition: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Examon"],
                    match: "name",
                  },
                ],
              },
              raw: "you have a Digimon with [Examon] in its name in play",
            },
          },
          options: [
            [
              {
                kind: "Suspend",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
              },
              {
                kind: "GainKeyword",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                keyword: {
                  keyword: "Piercing",
                  raw: "＜Piercing＞",
                },
                duration: "forTheTurn",
              },
            ],
            [
              {
                kind: "Unsuspend",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-070", compiled);
