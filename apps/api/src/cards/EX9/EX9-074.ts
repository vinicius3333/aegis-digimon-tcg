import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  assemblyRequirement: [
    { reduceCost: 7, materials: [{ count: 7, level: 4, traits: ["DM"], kinds: ["Digimon"], differentNames: true }] },
  ],
  digivolutionRequirement: [
    {
      level: 4,
      colors: ["Red"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["Blue"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["Yellow"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["Green"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["Black"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["Purple"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      colors: ["White"],
      cost: 5,
      isAlternate: true,
    },
  ],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security A. +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 level 4 or lower [DM] trait Digimon card from your trash as this Digimon's top digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["DM"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          position: "top",
          optional: true,
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's Digimon with the same color as any of this Digimon's digivolution cards. If this Digimon has 6 or more colors in its digivolution cards, instead delete 1 of each of your opponent's Digimon with different colors.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              colorMatchesAnyDigivolutionCard: true,
            },
            count: 1,
          },
          condition: {
            kind: "not",
            condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 6 },
            raw: "this Digimon has fewer than 6 colors in its digivolution cards",
          },
        },
        {
          kind: "DeletePerColor",
          source: "digivolutionCards",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 6,
            raw: "this Digimon has 6 or more colors in its digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 level 4 or lower [DM] trait Digimon card from your trash as this Digimon's top digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["DM"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          position: "top",
          optional: true,
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's Digimon with the same color as any of this Digimon's digivolution cards. If this Digimon has 6 or more colors in its digivolution cards, instead delete 1 of each of your opponent's Digimon with different colors.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              colorMatchesAnyDigivolutionCard: true,
            },
            count: 1,
          },
          condition: {
            kind: "not",
            condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 6 },
            raw: "this Digimon has fewer than 6 colors in its digivolution cards",
          },
        },
        {
          kind: "DeletePerColor",
          source: "digivolutionCards",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 6,
            raw: "this Digimon has 6 or more colors in its digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
          scaling: {
            per: 1,
            unit: "digivolutionCardColors",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX9-074", compiled);
