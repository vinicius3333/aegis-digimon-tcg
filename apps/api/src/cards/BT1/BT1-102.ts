// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const drawPerSecurity = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  scaling: { per: 2, unit: "security", filter: { controller: "mine" } },
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [drawPerSecurity] },
    { trigger: "Security", actions: [drawPerSecurity] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-102", compiled);
export default compiled;
