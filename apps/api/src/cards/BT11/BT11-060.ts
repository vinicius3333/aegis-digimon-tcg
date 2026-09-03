import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "beReturned",
          duration: "permanent",
          byOpponentEffectsOnly: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-060", compiled);
