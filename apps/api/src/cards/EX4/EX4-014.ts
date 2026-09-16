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
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            nameOrTrait: [
              {
                tokens: ["Twilight"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  hasDigiXrosRequirements: true,
                },
                count: 1,
              },
              to: "hand",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-014", compiled);
