// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashTarget = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    orFilters: [
      { colors: ["Purple"], levelComparison: { op: "lte", value: 4 } },
      { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }], levelComparison: { op: "lte", value: 4 } },
    ],
  },
  count: 1,
  countModifier: { amount: 1, condition: { kind: "digiXrosCount", minimum: 1 } },
};
const gainTarget = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    orFilters: [{ nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] }, { keywords: ["Retaliation"] }],
  },
  count: "all",
};
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{ kind: "PlayWithoutCost", target: trashTarget, from: ["trash"], payCost: false, optional: true, allOrNone: true, mustPlayExactCountIfPossible: true }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", target: trashTarget, from: ["trash"], payCost: false, optional: true, allOrNone: true, mustPlayExactCountIfPossible: true }],
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "GainKeyword", target: gainTarget, keyword: { keyword: "Rush", raw: "＜Rush＞" }, duration: "permanent" },
        { kind: "GainKeyword", target: gainTarget, keyword: { keyword: "Blocker", raw: "＜Blocker＞" }, duration: "permanent" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-086", compiled);
