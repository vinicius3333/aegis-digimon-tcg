import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "MaterialSave",
          amount: 2,
          raw: "＜Material Save 2＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
          },
          from: ["digivolutionCardsUnderTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Blue Flare"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["digivolutionCardsUnderTamers"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Greymon"],
          colors: ["Blue"],
        },
        {
          names: ["MailBirdramon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT19-025", compiled);
