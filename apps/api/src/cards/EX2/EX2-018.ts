import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          maxSecurity: 5,
          scaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "none",
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-018", compiled);
