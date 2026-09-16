import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          raw: "when an opponent's Digimon with no digivolution cards would digivolve",
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

registerIrCard("EX3-019", compiled);
