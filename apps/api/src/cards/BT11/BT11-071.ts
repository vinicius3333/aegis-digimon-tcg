// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const enterActions: any[] = [
  {
    kind: "PlaceUnder",
    target: {
      filter: {
        controller: "mine",
        zone: ["hand", "trash"],
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Knightmon"], match: "name" },
          { tokens: ["Bagra Army"], match: "trait" },
        ],
      },
      count: 1,
      from: ["hand", "trash"],
    },
    underFilter: { isSelfRef: true },
    optional: true,
  },
  {
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 },
    amount: 1,
    condition: {
      kind: "selfDigivolutionStackHasTrait",
      filter: { nameOrTrait: [{ tokens: ["Tuwarmon"], match: "name" }] },
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["DarkKnightmon", "Tuwarmon"],
        },
      ],
    },
    { trigger: "OnPlay", actions: enterActions },
    { trigger: "WhenDigivolving", actions: enterActions },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: { zone: "trash", controller: "mine", kind: ["Digimon"], colors: ["Black", "Purple"] },
            count: 2,
            upTo: true,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [{ names: ["DarkKnightmon"] }, { names: ["Tuwarmon"] }],
      count: 2,
    },
  ],
};

registerIrCard("BT11-071", compiled);
