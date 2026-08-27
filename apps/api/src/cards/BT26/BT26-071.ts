// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const deleteAction = {
  kind: "Delete",
  target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
  cost: {
    kind: "deleteOwn",
    target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
    raw: "By deleting 1 of your Digimon",
  },
  optional: true,
  abortOnDecline: true,
  allowCostWithoutTarget: true,
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "OnPlay", actions: [deleteAction] },
    { trigger: "WhenDigivolving", actions: [deleteAction] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["NSo"], cost: 2, isAlternate: true }],
};
registerIrCard("BT26-071", compiled);
