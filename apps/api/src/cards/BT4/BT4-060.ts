import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 4,
            },
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-060", compiled);
