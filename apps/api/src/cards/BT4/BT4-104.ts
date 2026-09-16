import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Trash the top card of your security stack.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, gain 2 memory.",
          kind: "GainMemory",
          amount: 2,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-104", compiled);
