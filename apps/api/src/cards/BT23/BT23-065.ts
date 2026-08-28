// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Bakemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ghostmon"],
                match: "name",
              },
            ],
          },
          position: "bottom",
          bindHostAs: "ghostmonHost",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "ghostmonHost",
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
          },
          from: ["hand"],
          source: "triggerSource",
          costOverride: 3,
          ignoreRequirements: true,
          payCost: true,
        },
      ],
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            {
              tokens: ["Violet Inboots"],
              match: "name",
            },
          ],
        },
        raw: "you have [Violet Inboots]",
      },
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Ghost"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
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
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Ghost"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-065", compiled);
