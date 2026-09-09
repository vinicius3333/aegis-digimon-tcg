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
        // KB Q3134: ONE opponent Digimon is chosen for the whole clause, and ＜De-Digivolve 1＞ is
        // then applied to THAT Digimon once per your Digimon. The scaling on DeDigivolve is a
        // repetition count (Q4568), and each repetition re-resolves its target, so the choice is
        // bound first and reused — otherwise every repetition could pick a different Digimon.
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "deDigivolveTarget",
          },
        },
        {
          kind: "DeDigivolve",
          target: {
            fromSelectionRef: "deDigivolveTarget",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
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
            match: "nameExact",
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
      namesExact: ["LordKnightmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-073", compiled);
