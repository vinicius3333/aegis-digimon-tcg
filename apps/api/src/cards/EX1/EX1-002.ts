// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{ kind: "Draw", count: 1, attackPlayer: true }],
    isInherited: true,
    frequency: "OncePerTurn",
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-002", compiled);
