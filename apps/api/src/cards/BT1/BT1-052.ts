import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-052", compiled);
export default compiled;
