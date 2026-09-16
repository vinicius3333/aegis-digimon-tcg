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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.4"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    faceDown: true,
                    position: "bottom",
                    hostFilter: { isSelfRef: true },
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by trashing this Digimon's bottom face-down digivolution card",
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("EX9-004", compiled);
