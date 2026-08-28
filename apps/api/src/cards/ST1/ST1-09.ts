import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{ trigger: "WhenBlocked", actions: [{ kind: "GainMemory", amount: 3 }], isInherited: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST1-09", compiled);
