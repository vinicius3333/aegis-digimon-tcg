// @ts-nocheck
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
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Return",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    superlative: "lowestLevel",
                  },
                  count: 1,
                },
                to: "deckBottom",
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Tamer"],
                    colors: ["Blue"],
                    playCostLte: 4,
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: false,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Return",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    superlative: "lowestLevel",
                  },
                  count: 1,
                },
                to: "deckBottom",
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Tamer"],
                    colors: ["Blue"],
                    playCostLte: 4,
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: false,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-025", compiled);
