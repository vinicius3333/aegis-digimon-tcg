// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-060 — Omnimon Alter-S.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
        },
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
            count: 1,
          },
          to: "deckBottom",
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
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["BlitzGreymon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["CresGarurumon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
            },
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              amount: 1,
              source: "this",
              faceDown: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 6 },
        { color: "Red", level: 6 },
      ],
    },
  ],
};

registerIrCard("EX4-060", compiled);
