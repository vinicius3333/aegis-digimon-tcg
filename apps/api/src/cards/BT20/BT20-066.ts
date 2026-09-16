import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's level 3 Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if it's your turn, 2 of your Digimon may DNA digivolve into a Digimon card with [Imperialdramon] in its name or the [Free] trait in the hand.",
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Imperialdramon"],
                match: "name",
              },
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
            zone: "hand",
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
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's level 3 Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if it's your turn, 2 of your Digimon may DNA digivolve into a Digimon card with [Imperialdramon] in its name or the [Free] trait in the hand.",
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Imperialdramon"],
                match: "name",
              },
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
            zone: "hand",
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
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-066", compiled);
