import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      timing: "endOfBattle",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 2,
          },
          keyword: { keyword: "SecurityAttack", amount: -1 },
          duration: "forTheTurn",
        },
        {
          kind: "AddToHandSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      condition: { kind: "memoryAtLeast", value: 1, controller: "mine" },
      actions: [
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          timings: ["whenDigivolving"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ cost: 3, isAlternate: true, level: 5, traits: ["DS"] }],
};

registerIrCard("EX8-035", compiled);
