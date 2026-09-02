import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR correction: BT18-073's Q&A requires the target Millenniummon to
// have a DNA Digivolution requirement. The generated card data omitted that
// structural header for BT18-019, so preserve it here for interpreter legality checks.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
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
                  match: "name",
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
          color: "Red",
          level: 5,
        },
        {
          color: "Black",
          level: 6,
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
