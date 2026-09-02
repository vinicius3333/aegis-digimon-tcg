import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
          kind: "PlayWithoutCost",
          target: {
            filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Purple", "Black"] },
            orFilters: [
              {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }],
                ownerTrashNameCountGte: { count: 5, tokens: ["Dex", "DeathX"] },
              },
            ],
            count: 1,
            upTo: true,
          },
          from: ["trash"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Dorugoramon"], cost: 2, isAlternate: true }],
};

registerIrCard("BT9-081", compiled);
