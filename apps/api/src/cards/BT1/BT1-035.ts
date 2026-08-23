// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [{ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 2 }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-035", compiled);
export default compiled;
