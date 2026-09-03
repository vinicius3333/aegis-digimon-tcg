import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-026", compiled);
export default compiled;
