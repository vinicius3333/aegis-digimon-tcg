import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST1-06", compiled);
