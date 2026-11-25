import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-033", compiled);
export { compiled };
