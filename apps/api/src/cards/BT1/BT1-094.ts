// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const deleteBlocker = {
  kind: "Delete",
  target: { filter: { controller: "opponent", kind: ["Digimon"], keywords: [{ keyword: "Blocker" }] }, count: 1 },
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
