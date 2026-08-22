// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-081 (DexDorugoramon).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfDigivolutionStackMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }] } },
              { kind: "digivolvedFromZone", zone: "trash" },
            ],
            raw: "this Digimon has [Dorugoramon] in its digivolution cards or is digivolving from the trash",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Purple", "Black"] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DeathXmon"], match: "name" }] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "selfHasMinTrash", count: 5, filter: { nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }] }, raw: "you have 5 or more cards with [Dex] or [DeathX] in their names in your trash" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-081", compiled);
