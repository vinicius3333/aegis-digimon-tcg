// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns]: While [LordKnightmon]/[X Antibody] is in this Digimon's digivolution cards,
// all your Digimon with [Knightmon] in its text gain <Alliance> and get +3000 DP.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "deDigivolveTarget",
          },
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      condition: {
        kind: "selfHasInDigivolutionCards",
        nameOrTrait: [
          {
            tokens: ["LordKnightmon"],
            match: "name",
          },
          {
            tokens: ["X Antibody"],
            match: "trait",
          },
        ],
        raw: "[LordKnightmon] or [X Antibody] is in this Digimon's digivolution cards",
      },
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Knightmon"],
                  match: "text",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
          duration: "permanent",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Knightmon"],
                  match: "text",
                },
              ],
            },
            count: "all",
          },
          amount: 3000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["LordKnightmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-073", compiled);
