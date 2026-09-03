import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const lowDp: Filter = { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } };
const one: Action = { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } };
const twoLow: Action = { kind: "Suspend", target: { filter: lowDp, count: 2 } };
const modal: Action = { kind: "Modal", choose: 1, options: [[one], [twoLow]] };
const mode: Action = {
  kind: "ConditionalBranch",
  condition: { kind: "opponentHas", countMin: 2, filter: { kind: ["Digimon"], dp: { op: "lte", value: 5000 } } },
  ifTrue: [modal],
  ifFalse: [one],
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [mode] },
    { trigger: "Security", actions: [mode] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-111", compiled);
export default compiled;
