// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dexDeathXThreshold = {
  kind: "selfHasMinTrash",
  count: 5,
  filter: { nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }] },
  raw: "you have 5 or more cards with [Dex] or [DeathX] in their names in your trash",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
            count: "all",
          },
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["Dorugoramon"], match: "nameExact" }] },
              },
              { kind: "digivolvedFromZone", zone: "trash" },
            ],
            raw: "has [Dorugoramon] in its digivolution cards or is digivolving from the trash",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a purple or black level 3", "Play DeathXmon instead"],
          optionConditions: [null, dexDeathXThreshold],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Purple", "Black"] },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
                optional: true,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }],
                  },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Dorugoramon"], cost: 2, isAlternate: true }],
};

registerIrCard("BT9-081", compiled);
