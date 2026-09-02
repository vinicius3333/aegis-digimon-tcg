import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-035.
// TrashDigivolution: changed count:1 + amount:4 to scope:"acrossDigimon" + amount:4 so the
// controller picks 4 cards from across ALL opponent Digimon's stacks (not just 1 Digimon).
// AllTurns SubTrigger uses `whenAnyDigivolves`; its source filter is intentionally `any` so
// the watcher fires for either player's Digimon, matching the printed "when any Digimon" text.
// CR 16-36-1 scopes Decode to "THAT Digimon's digivolution cards", so each replacement's
// PlayWithoutCost carries `hostFilter: { isSelfRef: true }`; without it the
// `from: ["digivolutionCards"]` pool spans every stack the controller owns.
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
                  hostFilter: { isSelfRef: true },
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
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
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
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
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
      traits: ["ME", "VB"],
      cost: 3,
      isAlternate: true,
      level: 5,
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
      materials: [
        {
          count: 1,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
          level: 5,
        },
        {
          count: 1,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
          level: 4,
        },
        {
          count: 1,
          nameOrTrait: [
            { tokens: ["Gabumon", "Garurumon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
          level: 3,
        },
      ],
      reduceCost: 6,
    },
  ],
};

registerIrCard("EX12-035", compiled);
