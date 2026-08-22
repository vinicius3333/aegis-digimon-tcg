// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "GainKeyword", target: { filter: {}, count: 1, isSelf: true }, keyword: { keyword: "Blocker" }, duration: "permanent" }],
    },
    { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-07", compiled);
export { compiled };
