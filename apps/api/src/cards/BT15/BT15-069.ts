import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "memoryAtMost",
            controller: "opponent",
            value: 1,
            raw: "your opponent has 1 or less memory",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "memoryAtLeast",
            controller: "opponent",
            value: 1,
            raw: "your opponent has 1 or more memory",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-069", compiled);
export { compiled };
