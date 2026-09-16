import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Blue", level: 4 },
      ],
    },
  ],
  digivolutionRequirement: [{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
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
                  colors: ["Yellow", "Black"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["CS"],
                        match: "trait",
                      },
                    ],
                    levelComparison: {
                      op: "lte",
                      value: 4,
                    },
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
                  colors: ["Yellow", "Black"],
                  levelComparison: { op: "lte", value: 4 },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    levelComparison: { op: "lte", value: 4 },
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
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-032", compiled);
