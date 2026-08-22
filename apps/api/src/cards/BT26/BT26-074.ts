// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const titanOption = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
};
const ownHand = { controllerDefault: "mine", zone: "hand" };
const currentTurn = { kind: "raw", raw: "if it is your turn" };
const useTitanOption = {
  kind: "UseOptionWithoutCost",
  target: { filter: titanOption, count: 1 },
  from: ["trash"],
  payCost: true,
  reduceCostBy: 2,
  optional: true,
  condition: currentTurn,
  cost: { kind: "trash", target: { filter: ownHand, count: 1 } },
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: "trash-hand-use-titan-option-from-trash",
      actions: [useTitanOption],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "trash-hand-use-titan-option-from-trash",
      actions: [useTitanOption],
    },
    {
      trigger: "OnAllyAttack",
      frequency: "OncePerTurn",
      sharedUseKey: "trash-hand-use-titan-option-from-trash",
      actions: [useTitanOption],
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            count: 1,
            superlative: "lowestLevel",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-074", compiled);
