import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardsPosition: "bottom",
          requirePlacedOwnTopAtStackBottom: true,
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            {
              kind: "Trash",
              target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-006", compiled);
