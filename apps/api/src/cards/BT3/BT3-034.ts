import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR: the prose compiler does not preserve the optional security move and
// its dependent draw. Q1068–Q1071 establish the two branches precisely.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "lookAndMayAddToHand",
          controller: "mine",
          ifAddedToHand: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-034", compiled);
