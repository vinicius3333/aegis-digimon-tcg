// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          condition: { kind: "raw", raw: "they don't" },
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-102", compiled);
