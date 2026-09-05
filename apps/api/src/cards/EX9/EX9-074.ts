// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: KB Q5003:
//   1. You MAY place 1 Lv.4-or-lower [DM] Digimon from trash as TOP divo card (optional).
//   2. THEN mandatory: delete 1 opponent's Digimon whose color matches any divo card color.
//   3. IF 6+ colors in divo cards: INSTEAD of (2), delete 1 of each opponent's Digimon
//      with different colors (one per color, cannot choose same Digimon twice — KB Q5004).
// Steps 2 and 3 are mutually exclusive "instead" branches encoded as conditioned actions.
// New capabilities needed (see LANE_E.md):
//   - Delete.target.filter.colorMatchesAnyDigivolutionCard:true
//   - DeletePerColor (per-color mandatory delete using divo card colors)
export const compiled: CompiledCard = {
  assemblyRequirement: [
    { reduceCost: 7, materials: [{ count: 7, level: 4, traits: ["DM"], kinds: ["Digimon"], differentNames: true }] },
  ],
  digivolutionRequirement: [
    {
      level: 4,
      color: "Red",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "Blue",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "Yellow",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "Green",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "Black",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "Purple",
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      color: "White",
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
