// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-08", compiled);
