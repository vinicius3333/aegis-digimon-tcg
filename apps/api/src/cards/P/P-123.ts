// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q4236: gaining memory is mandatory even when the optional hatch is declined.
// Q4239: this watcher may trigger when Ukkomon itself moves out of breeding.
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
            { kind: "GainMemory", amount: 1 },
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
