// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "Trash",
          target: {
            filter: { zone: "hand", controller: "mine" },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-06", compiled);
