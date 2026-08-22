// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLv4 = { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } };
const handCard = { controllerDefault: "mine", zone: "hand" };
const deleteWithTrash = { kind: "Delete", target: { filter: opponentLv4, count: 1 }, cost: { kind: "trash", target: { filter: handCard, count: 1 } } };
const deleteWithKeenan = { kind: "Delete", target: { filter: opponentLv4, count: 1 }, cost: { kind: "place", target: { filter: handCard, count: 1 }, underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Keenan Crier"], match: "name" }] }, host: "target", position: "bottom", faceDown: true } };
const altCostDelete = { kind: "Modal", choose: 1, options: [[deleteWithTrash], [deleteWithKeenan]] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [altCostDelete] },
    { trigger: "WhenDigivolving", actions: [altCostDelete] },
    { trigger: "OnDeletion", isInherited: true, actions: [{ kind: "Trash", chooser: "opponent", target: { filter: { controllerDefault: "opponent", zone: "hand" }, count: 1 }, optional: true }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-072", compiled);
