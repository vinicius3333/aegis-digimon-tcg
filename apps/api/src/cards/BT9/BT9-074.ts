import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
    },
    {
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 2, condition: { kind: "selfColorCount", op: "gte", value: 2 } }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-074", compiled);
