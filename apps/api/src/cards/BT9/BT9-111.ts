import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
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
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              hostFilter: {
                isSelfRef: true,
              },
              nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
              excludeKind: ["Digi-Egg"],
            },
            count: 7,
            upTo: true,
          },
          to: "deckBottom",
          order: "any",
          optional: true,
          trackCount: "bt9-111-returned",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "bt9-111-returned",
            count: 1,
          },
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "bt9-111-returned",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Alphamon"],
      cost: 3,
      isAlternate: true,
      minNameStackCount: 1,
      minNameStackNames: ["Ouryumon"],
    },
  ],
};

registerIrCard("BT9-111", compiled);
