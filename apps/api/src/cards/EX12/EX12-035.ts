// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-035.
// TrashDigivolution: changed count:1 + amount:4 to scope:"acrossDigimon" + amount:4 so the
// controller picks 4 cards from across ALL opponent Digimon's stacks (not just 1 Digimon).
// AllTurns SubTrigger uses `whenAnyDigivolves`; its source filter is intentionally `any` so
// the watcher fires for either player's Digimon, matching the printed "when any Digimon" text.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Evade",
          raw: "＜Evade＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.5 or lower w/[Gabumon]/[Garurumon] in name or w/[ME]/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [
                    { tokens: ["Gabumon", "Garurumon"], match: "name" },
                    { tokens: ["ME", "VB"], match: "trait" },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          amount: 4,
          scope: "acrossDigimon",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsCompareToSource: "lte",
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          amount: 4,
          scope: "acrossDigimon",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsCompareToSource: "lte",
            },
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
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Garurumon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["ME", "VB"],
      cost: 3,
      isAlternate: true,
    },
  ],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 5 },
        { color: "Yellow", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Black", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Black", level: 5 },
        { color: "Yellow", level: 5 },
      ],
    },
  ],
  assemblyRequirement: [
    {
      reduceCost: 6,
      materials: [
        {
          count: 1,
          level: 5,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
        },
        {
          count: 1,
          level: 4,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
        },
        {
          count: 1,
          level: 3,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
        },
      ],
    },
  ],
};

registerIrCard("EX12-035", compiled);
