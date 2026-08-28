import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1206-Q1208: this is a normal security trash, not an attack, and each copy
// triggers independently at the opponent's end step.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 2 }],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1 }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-047", compiled);
