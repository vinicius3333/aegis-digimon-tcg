// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const plutomon = { controller: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Plutomon"], match: "name" }] };
const deleteLevel6 = {
  kind: "Delete",
  target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } }, count: 1 },
  cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
};
const decode = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "instead",
  leaveCause: "otherThanBattle",
  sourceFilter: { isSelfRef: true },
  actions: [{ kind: "PlayWithoutCost", target: { filter: plutomon, count: 1 }, fromOwnDigivolutionStack: true, payCost: false, optional: true }],
};
const trimHands = [
  { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: "all", untilHandSize: 4 } },
  { kind: "Trash", target: { filter: { controller: "opponent", zone: "hand" }, count: "all", untilHandSize: 4 }, chooser: "opponent" },
];
const shared = { frequency: "OncePerTurn", sharedUseKey: "bt26-079-trash-cost-delete", actions: [deleteLevel6] };

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    { keyword: "Retaliation", raw: "＜Retaliation＞" },
    { keyword: "Decode", raw: "＜Decode ([Plutomon])＞" },
  ],
  effects: [
    { trigger: "Static", actions: [decode] },
    { trigger: "Main", isFromTrash: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["trash"], payCost: true, reduceCostBy: 4, condition: { kind: "handAtMost", value: 5 } }] },
    { trigger: "OnPlay", ...shared },
    { trigger: "WhenDigivolving", ...shared },
    { trigger: "WhenAttacking", ...shared },
    { trigger: "AllTurns", frequency: "OncePerTurn", sharedUseKey: "bt26-079-hand-trim", actions: [
      { kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: trimHands },
      { kind: "SubTrigger", event: "whenAnyDigivolves", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: trimHands },
    ] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Plutomon"], cost: 1, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
  ],
  assemblyRequirement: [{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }],
};

registerIrCard("BT26-079", compiled);
export default compiled;
