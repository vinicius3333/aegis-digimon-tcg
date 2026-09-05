// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-021 — GreyKnightsmon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["MetalGreymon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
          ],
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-021", compiled);
