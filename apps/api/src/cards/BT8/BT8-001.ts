// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "selfDpAtLeast", value: 6000, raw: "this Digimon has 6000 DP or more" },
    }],
    isInherited: true,
    frequency: "OncePerTurn",
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-001", compiled);
