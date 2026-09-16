import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, if it's your turn, 2 of your Digimon may DNA digivolve into [Shakkoumon] in the hand.",
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            zone: "hand",
            nameOrTrait: [
              {
                tokens: ["Shakkoumon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, if it's your turn, 2 of your Digimon may DNA digivolve into [Shakkoumon] in the hand.",
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            zone: "hand",
            nameOrTrait: [
              {
                tokens: ["Shakkoumon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["CS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-027", compiled);
