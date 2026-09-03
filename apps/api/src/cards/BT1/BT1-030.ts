import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [{ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "GainMemory", amount: 1 }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-030", compiled);
export default compiled;
