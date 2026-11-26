import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD03-09", compiled);
