import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
            untilHandSize: 4,
          },
          trackCount: "trashedThisEffect",
        },
        {
          effectTextPart:
            "Then, play 1 8000 DP or lower Digimon card from your trash without paying the cost. For each card this effect trashed, remove 2000 from this effect's DP maximum.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "lte", value: 8000 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          dpCeilingModifier: {
            mode: "lowerCeiling",
            amount: 2000,
            scalingSource: "trashedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
            untilHandSize: 4,
          },
          trackCount: "trashedThisEffect",
        },
        {
          effectTextPart:
            "Then, play 1 8000 DP or lower Digimon card from your trash without paying the cost. For each card this effect trashed, remove 2000 from this effect's DP maximum.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "lte", value: 8000 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          dpCeilingModifier: {
            mode: "lowerCeiling",
            amount: 2000,
            scalingSource: "trashedThisEffect",
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
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Dragon", "Evil Dragon"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          amount: 2000,
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Dragon", "Evil Dragon"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Dragon", "Evil Dragon"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
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
      level: 5,
      traits: ["Dark Dragon", "Evil Dragon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-077", compiled);
