import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-002", compiled);
