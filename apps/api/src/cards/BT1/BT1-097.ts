// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    { trigger: "Security", actions: [{ kind: "Draw", controller: "mine", amount: 2 }] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-097", compiled);
export default compiled;
