import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          once: true,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "triggerByYourEffect" },
            },
          ],
          raw: "[Your Turn][Once Per Turn] When you trash a digivolution card of 1 of your opponent's Digimon, gain 1 memory",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-022", compiled);
