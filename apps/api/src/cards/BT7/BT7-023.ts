import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Blue"],
            },
            count: 1,
          },
          asLevel: 3,
          from: ["hand"],
          payCost: true,
          costOverride: 2,
          optional: true,
        },
      ],
    },
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
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Hybrid"], match: "trait" },
                { tokens: ["Tommy Himi"], match: "nameExact" },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [Tommy Himi] is in this Digimon's digivolution cards",
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
