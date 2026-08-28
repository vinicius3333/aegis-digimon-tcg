// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 1,
          target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: "all" },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
            nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "trait" }],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
          restriction: "suspendThisTamer",
          optional: true,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              suspended: true,
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-034", compiled);
