// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 2,
            },
          ],
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                levelEqTriggerSource: true,
              },
              count: 1,
            },
            raw: "by trashing 1 card of the same level in your hand",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-052", compiled);
