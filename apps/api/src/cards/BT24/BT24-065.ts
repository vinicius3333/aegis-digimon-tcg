import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Overclock",
          raw: "＜Overclock ([Unidentified] Trait)＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] To 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon.",
          kind: "DeDigivolve",
          target: {
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
          effectTextPart: "Then, delete all of your opponent's Digimon with the highest play cost.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Diaboromon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Diaboromon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                source: "thisDigimon",
              },
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Diaboromon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-065", compiled);
