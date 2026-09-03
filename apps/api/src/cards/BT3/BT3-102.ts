import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  cardId: "BT3-102",
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", optionalFor: "opponent", amount: 1 },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          condition: { kind: "opponentDeclinedTrash", raw: "if they don't" },
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-102", compiled);
