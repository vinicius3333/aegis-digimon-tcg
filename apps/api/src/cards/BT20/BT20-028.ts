import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: {
          nameOrTrait: [
            {
              tokens: ["MetalSeadramon"],
              match: "nameExact",
            },
            {
              tokens: ["X Antibody"],
              match: "nameExact",
            },
          ],
        },
        raw: "this Digimon has [MetalSeadramon] or [X Antibody] in its digivolution cards",
      },
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: {
          nameOrTrait: [
            {
              tokens: ["MetalSeadramon"],
              match: "nameExact",
            },
            {
              tokens: ["X Antibody"],
              match: "nameExact",
            },
          ],
        },
        raw: "this Digimon has [MetalSeadramon] or [X Antibody] in its digivolution cards",
      },
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            fromDigivolution: true,
          },
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
          ],
          raw: "When any of your Digimon are played from digivolution cards, De-Digivolve 2",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["MetalSeadramon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-028", compiled);
