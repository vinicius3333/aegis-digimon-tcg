// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playActions = [
  {
    kind: "PlaceUnder",
    target: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
        zone: ["hand", "underTamers"],
      },
      count: 1,
      from: ["hand", "underTamers"],
    },
    optional: true,
  },
  {
    kind: "Return",
    target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
    to: "deckBottom",
  },
  {
    kind: "Return",
    target: {
      filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
      count: 1,
    },
    to: "deckBottom",
    condition: {
      kind: "selfDigivolutionStackHasTrait",
      filter: { nameOrTrait: [{ tokens: ["Cyberdramon"], match: "name" }] },
      raw: "[Cyberdramon] is in this Digimon's digivolution cards",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["MetalGreymon", "Cyberdramon"],
        },
      ],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    },
    { trigger: "OnPlay", actions: playActions },
    { trigger: "WhenDigivolving", actions: playActions },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["MetalGreymon"] }, { names: ["Cyberdramon"] }], count: 2 }],
};

registerIrCard("BT11-030", compiled);
