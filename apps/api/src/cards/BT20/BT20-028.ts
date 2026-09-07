import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-028 GigaSeadramon — Lv.6 Digimon
// <Security A. +1>, <Reboot>, <Blocker>
// [When Digivolving][When Attacking][Once Per Turn] From the digivolution cards of this Digimon
//   with [MetalSeadramon] or [X Antibody] in its digivolution cards, you may
//   play 1 level 5 or lower Digimon card without paying the cost.
// [All Turns][Once Per Turn] When any of your Digimon are played from digivolution cards,
//   <De-Digivolve 2> 1 of your opponent's Digimon.
//
// KB Q4320: Effect can't activate without [MetalSeadramon] or [X Antibody] in digivolution cards.
// KB Q4321: Triggers when this card itself is played from digivolution cards.
// Bracketed names are exact card names, including Rule aliases (CR 2-3-1-2; P-139 Q4246).
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
