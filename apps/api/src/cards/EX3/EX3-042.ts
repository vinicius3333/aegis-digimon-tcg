// @ts-nocheck
// HAND-FIXED — the [When Digivolving] "if this Digimon is suspended" gate is the structured
// selfIsSuspended condition, not the raw fallback the compiler emitted. Do not regenerate over
// this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR: the inherited watcher explicitly observes any of the controller's Digimon,
// while the When Digivolving gate reads this permanent's live suspended state.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
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
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
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
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-042", compiled);
