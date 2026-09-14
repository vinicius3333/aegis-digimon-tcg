import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const enterActions: Action[] = [
  {
    effectTextPart:
      "[On Play][When Digivolving] You may place 1 Digimon card with [Knightmon] in its name or [Bagra Army] in its traits from your hand or trash under this Digimon as its top digivolution card.",
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
    effectTextPart:
      "Then, if [Tuwarmon] is in this Digimon's digivolution cards, ＜De-Digivolve 1＞ 3 of your opponent's Digimon.",
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 },
    amount: 1,
    condition: {
      kind: "selfDigivolutionStackHasTrait",
      filter: { nameOrTrait: [{ tokens: ["Tuwarmon"], match: "nameExact" }] },
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
