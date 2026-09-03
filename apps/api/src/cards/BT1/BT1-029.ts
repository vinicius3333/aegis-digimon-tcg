import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [{ trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-029", compiled);
export default compiled;
