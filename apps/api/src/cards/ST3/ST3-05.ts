// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 4, raw: "you have 4 or more security cards" } }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-05", compiled);
export { compiled };
