import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "trashFromHand",
            filter: {
              controller: "mine",
              zone: "hand",
              nameOrTrait: [
                { tokens: ["Cyborg"], match: "trait" },
                { tokens: ["Ver.5"], match: "trait" },
              ],
            },
          },
          amount: { kind: "fixed", value: 2 },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            from: ["trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          faceDown: true,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution cards.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: { kind: "countFaceDownDigivolutionCards", host: "self" },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's 3000 DP or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            from: ["trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          faceDown: true,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution cards.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: { kind: "countFaceDownDigivolutionCards", host: "self" },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's 3000 DP or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      isInherited: true,
      keywords: [],
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
            keyword: "Piercing",
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 3,
      isAlternate: true,
      level: 4,
      names: ["Tyrannomon"],
    },
    {
      cost: 3,
      isAlternate: true,
      traits: ["DM"],
      level: 4,
    },
  ],
};

registerIrCard("EX9-043", compiled);
