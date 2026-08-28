// @ts-nocheck
// HAND-FIXED — suspending an already suspended Digimon is not a state transition, so it is not
// a legal target for this mandatory effect. Keep the structured `suspended: false` filter when
// regenerating the compiled IR.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR: the self-scoped watcher targets exactly 1 active opposing Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  suspended: false,
                },
                count: 1,
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

registerIrCard("EX3-038", compiled);
