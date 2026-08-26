// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: { count: 1, filter: { isSelfRef: true }, isSelf: true },
          from: ["hand"],
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Vegetation"], match: "trait" },
              { tokens: ["TS"], match: "trait" },
            ],
          },
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }],
};
registerIrCard("BT26-034", compiled);
