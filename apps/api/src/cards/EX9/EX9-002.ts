// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: {
            isSelfRef: true,
          },
          sourceFilter: {
            controllerDefault: "mine",
          },
          addedDigivolutionCardFilter: {
            faceDown: true,
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
                    tokens: ["Ver.2"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              reduceCost: 1,
              payCost: true,
              optional: true,
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

registerIrCard("EX9-002", compiled);
