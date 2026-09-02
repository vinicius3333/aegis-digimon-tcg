import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashTarget: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    or: [
      { colors: ["Purple"], levelComparison: { op: "lte", value: 4 } },
      { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }], levelComparison: { op: "lte", value: 4 } },
    ],
  },
  count: 1,
  countModifier: { amount: 1, condition: { kind: "digiXrosCount", minimum: 1 } },
};
const gainTarget: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    or: [{ nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] }, { keywords: ["Retaliation"] }],
  },
  count: "all",
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 0,
          additionalEffects: [{ kind: "AllowDigiXrosMaterialsFromTrash" }],
          raw: "cards from your trash can also be placed as DigiXros materials",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: trashTarget,
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: trashTarget,
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          target: gainTarget,
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: gainTarget,
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ traits: ["Xros Heart"] }], count: 3 }],
};

registerIrCard("BT11-086", compiled);
