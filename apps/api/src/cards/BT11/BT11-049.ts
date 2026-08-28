import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{ trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] }],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-049", compiled);
