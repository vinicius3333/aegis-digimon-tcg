// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 }],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "mine",
          amount: 5000,
          duration: "permanent",
          condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-031", compiled);
