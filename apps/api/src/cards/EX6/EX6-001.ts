// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX6-001 — inherited Once Per Turn Legend-Arms stack-placement watcher. */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { traits: ["Legend-Arms"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
          raw: "When an effect places a card with the [Legend-Arms] trait in this Digimon's digivolution cards, gain 1 memory.",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-001", compiled);
