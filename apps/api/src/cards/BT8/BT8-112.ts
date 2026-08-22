// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sharedBody = [
  {
    kind: "TrashDigivolution",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        digivolutionCards: "hasAny",
      },
      count: 1,
    },
    amount: 99,
    cost: {
      kind: "return",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          multicolor: true,
        },
        count: 1,
      },
      to: "deckBottom",
    },
    optional: true,
  },
  {
    kind: "Return",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        digivolutionCards: "none",
      },
      count: "all",
    },
    to: "deckBottom",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { cardId: "BT8-112" },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 4,
              cost: {
                kind: "return",
                target: {
                  filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levels: [7], colors: ["White"] },
                  count: 1,
                },
                to: "deckBottom",
              },
            },
          ],
        },
      ],
    },
    { trigger: "WhenDigivolving", actions: sharedBody },
    { trigger: "WhenAttacking", actions: sharedBody, frequency: "OncePerTurn" },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-112", compiled);
