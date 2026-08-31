// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: Return "up to 14 play cost's total worth" uses
// Return.totalPlayCostBudget:14 — new capability (see LANE_E.md).
// PlayMultiple from digivolutionCards: from:["digivolutionCards"] corrected from "digivolution".
// [All Turns] Aura: "none of your opponent's Digimon can activate [On Play] effects"
// — restriction:"activateOnPlay", targets ALL opponent Digimon (count:"all"),
// while condition: memoryAtMost:1 per KB Q3899.
// GrantStatic: immuneToOpponentDigimonEffects is already correct per KB.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            totalPlayCostBudget: 14,
            upTo: true,
          },
          to: "deckBottom",
        },
        {
          kind: "PlayMultiple",
          totalCost: 12,
          filter: {
            controllerDefault: "mine",
            hostFilter: {
              isSelfRef: true,
            },
            nameOrTrait: [
              {
                tokens: ["DS"],
                match: "trait",
              },
            ],
          },
          from: ["digivolutionCards"],
          payCost: false,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              trait: ["DS"],
            },
            count: "all",
          },
          grant: "immuneToOpponentDigimonEffects",
          tokens: [],
          condition: {
            kind: "memoryAtLeast",
            value: 1,
            controller: "mine",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "activateOnPlay",
          },
          while: {
            kind: "memoryAtMost",
            value: 1,
            controller: "mine",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX8-029", compiled);
