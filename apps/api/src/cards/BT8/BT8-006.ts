// HAND-AUTHORED OVERRIDE — maintained as a direct implementation. The declarative effect used the
// nonexistent SubTriggerEvent "whenDeckTrashed"; the real event is "onDiscardLibrary",
// whose default gate (no sourceFilter) watches the OPPONENT's deck being milled, so an
// explicit "controller": "mine" sourceFilter is required for "when a card is trashed
// from YOUR deck" (inheritedEffectText, KB Q1696/Q1697).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
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

registerIrCard("BT8-006", compiled);
