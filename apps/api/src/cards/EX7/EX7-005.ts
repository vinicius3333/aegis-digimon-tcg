// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
          raw: "When an effect places a Three Musketeers Option card in this Digimon's digivolution cards, gain 1 memory",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-005", compiled);
