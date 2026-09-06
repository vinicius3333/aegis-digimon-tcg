import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Draw",
              amount: 1,
              controller: "mine",
            },
            {
              kind: "Draw",
              amount: 1,
              controller: "opponent",
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

registerIrCard("BT25-002", compiled);
