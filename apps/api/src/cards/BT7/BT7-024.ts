// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          scaling: {
            per: 1,
            unit: "cards",
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
          },
          raw: "Draw 1 for each opponent's Digimon with no digivolution cards.",
        },
      ],
    },
    {
      trigger: "Static",
      turnCondition: "opponentsTurn",
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        raw: "a card with the [Hybrid] trait is in this Digimon's digivolution cards",
      },
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOwnerTurnEnd",
          raw: "Your opponent's level 3 Digimon can't attack.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-024", compiled);
