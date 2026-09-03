import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const deleteBlocker: Action = {
  kind: "Delete",
  target: { filter: { controller: "opponent", kind: ["Digimon"], keywords: ["Blocker"] }, count: 1 },
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [deleteBlocker] },
    { trigger: "Security", actions: [deleteBlocker] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-094", compiled);
export default compiled;
