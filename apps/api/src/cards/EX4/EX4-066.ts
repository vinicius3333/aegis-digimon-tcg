// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Agumon", "Greymon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["BlitzGreymon"],
                      match: "nameExact",
                    },
                  ],
                },
                payCost: false,
                from: ["hand"],
                ignoreRequirements: true,
                optional: true,
                condition: {
                  kind: "youHave",
                  filter: {
                    zone: "battleArea",
                    controllerDefault: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["CresGarurumon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  raw: "you have [CresGarurumon] in play",
                },
              },
            ],
            [
              {
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Gabumon", "Garurumon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["CresGarurumon"],
                      match: "nameExact",
                    },
                  ],
                },
                payCost: false,
                from: ["hand"],
                ignoreRequirements: true,
                optional: true,
                condition: {
                  kind: "youHave",
                  filter: {
                    zone: "battleArea",
                    controllerDefault: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["BlitzGreymon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  raw: "you have [BlitzGreymon] in play",
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Gabumon", "Agumon"],
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

registerIrCard("EX4-066", compiled);
