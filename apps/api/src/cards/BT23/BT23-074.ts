// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayMultiple",
          totalCost: 6,
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Eater"],
                match: "trait",
              },
            ],
          },
          from: "hand",
          payCost: false,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "breeding",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "name",
                },
              ],
            },
            raw: "you have [Mother Eater] in the breeding area",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayMultiple",
          totalCost: 6,
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Eater"],
                match: "trait",
              },
            ],
          },
          from: "hand",
          payCost: false,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "breeding",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "name",
                },
              ],
            },
            raw: "you have [Mother Eater] in the breeding area",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Erika Mishima"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-074", compiled);
