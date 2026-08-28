// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          grant: {
            kind: "Protection",
            protections: ["dpReduction", "deDigivolve"],
            from: "opponent",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          grant: {
            kind: "Protection",
            protections: ["dpReduction", "deDigivolve"],
            from: "opponent",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-162", compiled);
