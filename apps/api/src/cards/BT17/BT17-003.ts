// HAND-FIXED IR — the added card must be a Tamer and the receiver must be this inherited host.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: {
            isSelfRef: true,
          },
          addedDigivolutionCardFilter: {
            kind: ["Tamer"],
          },
          raw: "When an effect places a Tamer card in this Digimon's digivolution cards, gain 1 memory",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-003", compiled);
