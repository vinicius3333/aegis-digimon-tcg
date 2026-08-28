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
          event: "whenOptionPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          actions: [
            {
              kind: "Attack",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              withoutSuspending: false,
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

registerIrCard("BT23-003", compiled);
