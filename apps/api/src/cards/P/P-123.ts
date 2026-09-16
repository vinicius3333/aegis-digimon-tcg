import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            { kind: "Hatch", optional: true },
            {
              effectTextPart: "Then, gain 1 memory.",
              kind: "GainMemory",
              amount: 1,
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

registerIrCard("P-123", compiled);
