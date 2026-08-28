import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX4-073";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 3,
        },
        {
          kind: "DeleteBudget",
          filter: { controller: "opponent", kind: ["Digimon"] },
          budget: 6,
          upTo: true,
          minimum: 1,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      optional: true,
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
      },
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3,
          upTo: true,
          minAmount: 1,
          choose: true,
          cardFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
          trackCount: "ex4-073-trashed",
        },
        {
          kind: "RepeatPerCount",
          countSource: "ex4-073-trashed",
          action: {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon", "Tamer"], superlative: "lowestPlayCost" },
              count: 1,
            },
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 2,
          condition: { kind: "namedCountAtLeast", countSource: "ex4-073-trashed", count: 3 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 7, names: ["Omnimon"], cost: 2, isAlternate: true }],
};

registerIrCard(cardId, compiled);
