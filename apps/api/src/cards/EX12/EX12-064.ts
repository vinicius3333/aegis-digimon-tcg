// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const deleteOrDeDigivolve = [
  {
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        levelComparison: { op: "lte", value: 4 },
      },
      count: 1,
    },
  },
  {
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 1,
    condition: {
      kind: "ifThisEffectDidNotDelete",
      raw: "if this effect didn't delete a Digimon",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: deleteOrDeDigivolve,
    },
    {
      trigger: "WhenDigivolving",
      actions: deleteOrDeDigivolve,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Machine", "Cyborg", "ME"], match: "trait" }],
          },
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
          cost: {
            kind: "unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By unsuspending this Digimon",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Machine", "ME"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-064", compiled);
