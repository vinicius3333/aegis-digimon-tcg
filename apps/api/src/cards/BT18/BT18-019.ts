import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, by returning 1 of each Digimon card with different levels from your opponent's trash to the top of the deck, gain 1 memory for each card returned.",
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
                hasLevel: true,
              },
              count: "all",
              distinctLevels: true,
            },
            to: "deckTop",
            trackCount: "returnedDistinctLevels",
            raw: "by returning 1 of each Digimon card with different levels from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "returnedDistinctLevels",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, by returning 1 of each Digimon card with different levels from your opponent's trash to the top of the deck, gain 1 memory for each card returned.",
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
                hasLevel: true,
              },
              count: "all",
              distinctLevels: true,
            },
            to: "deckTop",
            trackCount: "returnedDistinctLevels",
            raw: "by returning 1 of each Digimon card with different levels from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "returnedDistinctLevels",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Millenniummon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Kimeramon"],
                    match: "name",
                  },
                  {
                    tokens: ["Machinedramon"],
                    match: "name",
                  },
                ],
              },
              count: 2,
              distinctNames: true,
            },
            to: "deckBottom",
            raw: "By returning 1 [Kimeramon] and 1 [Machinedramon] from your trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
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
        {
          namesExact: ["Kimeramon"],
        },
        {
          namesExact: ["Machinedramon"],
        },
      ],
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Kimeramon"],
        },
        {
          names: ["Machinedramon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT18-019", compiled);
