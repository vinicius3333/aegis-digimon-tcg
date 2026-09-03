import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        { kind: "GainMemory", amount: 3 },
        { kind: "GainMemory", amount: -3, at: "endOfTurn" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-058", compiled);
export default compiled;
