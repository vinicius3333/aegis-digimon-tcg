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
          kind: "DeleteByDPBudget",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          baseBudget: 3000,
          budgetBonus: {
            per: 2000,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
        {
          effectTextPart: "Then, for each Digimon deleted by this effect, gain 1 memory.",
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              deletedByThisEffect: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeleteByDPBudget",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          baseBudget: 3000,
          budgetBonus: {
            per: 2000,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
        {
          effectTextPart: "Then, for each Digimon deleted by this effect, gain 1 memory.",
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              deletedByThisEffect: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 3000,
          scope: "self",
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-011", compiled);
