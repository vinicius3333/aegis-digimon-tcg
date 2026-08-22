// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handCost = { kind: "trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } };
const deleteAction = { kind: "Delete", target: { filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 }, cost: handCost };
const titanTrash = { filter: { controllerDefault: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [
  { tokens: ["Titamon"], match: "name" }, { tokens: ["Titan"], match: "trait" },
] }, count: 1 };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 } }] }] },
    { trigger: "OnPlay", actions: [deleteAction] },
    { trigger: "WhenDigivolving", actions: [deleteAction] },
    { trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenHandTrashed", sourceFilter: { isSelfRef: true }, frequency: "OncePerTurn", actions: [{ kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: titanTrash, from: ["trash"], payCost: true, costDelta: -1, optional: true }] }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-069", compiled);
