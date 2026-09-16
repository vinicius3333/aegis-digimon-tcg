import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                source: "thisDigimon",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 4 },
                    nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                  },
                ],
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                source: "thisDigimon",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                  levelComparison: { op: "lte", value: 4 },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 4 },
                    nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                  },
                ],
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-023", compiled);
