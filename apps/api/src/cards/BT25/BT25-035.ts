import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, by trashing 2 bottom face-down cards from under any of your Tamers, this Digimon may digivolve into a [Glowing Dawn] trait Digimon card in the hand without paying the cost.",
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
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 2,
            raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
            optional: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, by trashing 2 bottom face-down cards from under any of your Tamers, this Digimon may digivolve into a [Glowing Dawn] trait Digimon card in the hand without paying the cost.",
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
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 2,
            raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
            optional: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-035", compiled);
