// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "DeDigivolve", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 3 },
        { kind: "DeleteBudget", filter: { controllerDefault: "opponent", kind: ["Digimon"] }, budget: 6, upTo: true, minimum: 1 },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      cost: {
        kind: "trash",
        target: { filter: { zone: "digivolutionCards", isSelfRef: true, kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } }, count: 3, upTo: true },
        trackCount: "trashedLevelSixPlus",
      },
      actions: [
        { kind: "RepeatPerCount", countSource: "trashedLevelSixPlus", action: { kind: "Delete", target: { filter: { controllerDefault: "opponent", kind: ["Digimon", "Tamer"], superlative: "lowestPlayCost" }, count: 1 } } },
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 2, condition: { kind: "namedCountAtLeast", countSource: "trashedLevelSixPlus", count: 3 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-073", compiled);
export default compiled;
