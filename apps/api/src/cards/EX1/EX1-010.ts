// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
    { trigger: "WhenAttacking", actions: [{ kind: "Draw", count: 2, attackPlayer: true }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-010", compiled);
