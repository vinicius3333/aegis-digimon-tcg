import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "nameExact",
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
              nameOrTrait: [
                {
                  tokens: ["Mother Eater"],
                  match: "nameExact",
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
      namesExact: ["Erika Mishima"],
      baseIsTamer: true,
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-074", compiled);
