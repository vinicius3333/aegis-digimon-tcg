// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const revealAndTrash = [
  {
    kind: "RevealAdd",
    revealCount: 3,
    add: [
      {
        filter: { nameOrTrait: [{ tokens: ["Aqua"], match: "traitContains" }] },
        orFilters: [
          { nameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }] },
          { nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
        ],
        count: 1,
      },
    ],
    rest: "deckBottom",
  },
  {
    kind: "TrashDigivolution",
    target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 1,
    fromTop: false,
  },
];

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 2, traits: ["DS"], cost: 0, isAlternate: true }],
  effects: [
    { trigger: "OnPlay", actions: revealAndTrash },
    { trigger: "WhenMoving", actions: revealAndTrash },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Aquatic"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-018", compiled);
