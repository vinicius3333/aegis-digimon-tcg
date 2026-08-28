// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less.
// If this effect didn't delete, trash the top 2 cards of your deck.
// KB Q4575: if opponent has a Digimon with 4000 DP or less, you MUST choose and delete it.
// KB Q4576: if chosen target has deletion protection, that counts as "didn't delete".
// Inherited [On Deletion]: Gain 1 memory.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectDidNotDelete",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectDidNotDelete",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Guilmon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-068", compiled);
