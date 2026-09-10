import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "HandManipulation", op: "trashVariable", amount: "untilFive" }],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          sourceFilter: { controller: "mine" },
          fireCondition: { kind: "triggerByYourEffect" },
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-043", compiled);
