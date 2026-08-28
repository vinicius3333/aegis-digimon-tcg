// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) WhenDigivolving Unsuspend: controllerDefault "mine" → "any" — KB Q5857 says
//     either player's Digimon can be unsuspended or suspended.
// (2) AllTurns CostModifier scaling filter: controllerDefault "mine" → "any" — text
//     says "For each suspended Digimon" with no controller restriction.

const compiled: CompiledCard = {
  digivolutionRequirement: [],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Vortex",
          raw: "＜Vortex＞",
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
          kind: "Unsuspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Green"],
                  dp: {
                    op: "lte",
                    value: 3000,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Avian", "Bird"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              dpCeilingModifier: {
                mode: "raiseCeiling",
                amount: 2000,
                scaling: {
                  per: 1,
                  filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
                  unit: "cards",
                },
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-035", compiled);
