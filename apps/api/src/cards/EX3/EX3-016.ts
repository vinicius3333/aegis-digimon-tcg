// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            digivolutionCards: "none",
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "increaseCost",
              amount: 1,
              raw: "increase the digivolution cost by 1",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-016", compiled);
