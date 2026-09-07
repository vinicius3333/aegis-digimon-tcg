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
          sourceFilter: {
            controllerDefault: "mine",
          },
          triggerFilter: {
            isSelfRef: true,
          },
          addedDigivolutionCardFilter: {
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "text",
                  },
                  {
                    tokens: ["TS"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              reduceCost: 2,
              payCost: true,
              optional: true,
              preserveOncePerTurnOnDecline: true,
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

registerIrCard("BT25-005", compiled);
