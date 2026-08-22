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
  kind: "PlayWithoutCost",
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
    { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "bt26-074-use-titan-option", actions: [useTitanOption] },
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-074-use-titan-option", actions: [useTitanOption] },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-074-use-titan-option", actions: [useTitanOption] },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1, superlative: "lowestLevel" } }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-074", compiled);
