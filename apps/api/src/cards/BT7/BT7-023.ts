// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Tommy Himi"],
                  match: "name",
                },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [Tommy Himi] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: { digivolutionCards: "none", controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          restriction: "block",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Hybrid"], match: "trait" },
                { tokens: ["Tommy Himi"], match: "name" },
              ],
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    },
  ],
};

registerIrCard("BT7-023", compiled);
