// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1247: the reduction applies to any Digimon with Digi-Burst, not only one
// with a When Digivolving clause.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ReturnToEggDeck",
          target: { filter: { controller: "mine", zone: "trash", kind: ["DigiEgg"] }, count: 1 },
          from: ["trash"],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 1,
          target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: "all" },
          into: { kind: ["Digimon"], effectTextContains: "Digi-Burst" },
          duration: "forTheTurn",
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1 },
          from: ["security"],
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-095", compiled);
