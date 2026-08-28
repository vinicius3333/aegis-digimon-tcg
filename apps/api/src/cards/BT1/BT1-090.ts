// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "GainMemory", amount: 2 },
        { kind: "GainMemory", amount: -2, at: "endOfTurn" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-090", compiled);
export default compiled;
