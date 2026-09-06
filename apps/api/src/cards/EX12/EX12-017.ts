import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-017 WarGreymon.
//
// Decode is carried by its printed keyword marker plus an executable would-leave replacement
// (CR 16-36: "instead" mode, so the Digimon still leaves). CR 16-36-1 scopes the played card to
// "THAT Digimon's digivolution cards", so the PlayWithoutCost target carries
// `hostFilter: { isSelfRef: true }`; without it the `from: ["digivolutionCards"]` pool spans
// every stack the controller owns. WarGreymon prints no inherited text, so there is exactly one
// Decode replacement rather than a printed/inherited pair.
//
// The printed [DNA Digivolve] "Red/Yellow Lv.5 + Black/Purple Lv.5" expands to the four ordered
// colour pairs below. [Assembly -6] lists one level-5, one level-4 and one level-3 material, each
// of which must satisfy the name/trait gate on its own (Q6743).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
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
                    { tokens: ["Agumon", "Greymon"], match: "name" },
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.5 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "Counter",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Omnimon"],
                match: "name",
              },
              {
                tokens: ["ME", "VB"],
                match: "trait",
              },
            ],
            hasDnaDigivolutionRequirement: true,
          },
          payCost: true,
          optional: true,
        },
        {
          kind: "RedirectAttack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 5 },
        { color: "Black", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Red", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Black", level: 5 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
  ],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Greymon"],
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
  assemblyRequirement: [
    {
      materials: [
        {
          count: 1,
          nameOrTrait: [
            {
              tokens: ["Agumon", "Greymon"],
              match: "name",
            },
            {
              tokens: ["ME", "VB"],
              match: "trait",
            },
          ],
          level: 5,
        },
        {
          count: 1,
          nameOrTrait: [
            {
              tokens: ["Agumon", "Greymon"],
              match: "name",
            },
            {
              tokens: ["ME", "VB"],
              match: "trait",
            },
          ],
          level: 4,
        },
        {
          count: 1,
          nameOrTrait: [
            {
              tokens: ["Agumon", "Greymon"],
              match: "name",
            },
            {
              tokens: ["ME", "VB"],
              match: "trait",
            },
          ],
          level: 3,
        },
      ],
      reduceCost: 6,
    },
  ],
};

registerIrCard("EX12-017", compiled);
