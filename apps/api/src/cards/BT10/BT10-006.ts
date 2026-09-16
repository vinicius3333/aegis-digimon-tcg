import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
          requireByEffect: true,
          raw: "[Opponent's Turn] When THIS digivolution card is trashed by an effect, Draw 1.",
          sourceFilter: {
            isSelfRef: true,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-006", compiled);
