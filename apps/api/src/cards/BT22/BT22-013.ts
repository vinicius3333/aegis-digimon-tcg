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
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Agumon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          into: {
            isSelfRef: true,
          },
          costOverride: 6,
          payCost: true,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Nokia Shiramine"],
                  match: "name",
                },
              ],
            },
            raw: "you have [Nokia Shiramine]",
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
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
                        tokens: ["Gabumon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["MetalGarurumon"],
                      match: "name",
                    },
                  ],
                },
                payCost: false,
                from: ["hand"],
                ignoreRequirements: true,
                optional: true,
              },
            ],
            [
              {
                kind: "Delete",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    superlative: "lowestDP",
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "security",
              position: "top",
            },
            count: 1,
          },
          condition: {
            kind: "selfHasNameContaining",
            names: ["Omnimon"],
            raw: "this Digimon has [Omnimon] in its name",
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
      level: 5,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT22-013", compiled);
