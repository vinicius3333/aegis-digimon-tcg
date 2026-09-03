import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "both", amount: 1 },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
              { kind: "selfDigivolutionCountAtLeast", value: 3 },
            ],
            raw: "your opponent has 8 or more cards in their hand or this Digimon has 3 or more digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "<Jamming>" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Night Claw", "Light Fang"], cost: 2, isAlternate: true }],
};

registerIrCard("BT16-020", compiled);
