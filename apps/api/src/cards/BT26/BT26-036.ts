// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const revealAdd = {
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        nameOrTrait: [
          { tokens: ["Vegetation"], match: "trait" },
          { tokens: ["Fairy"], match: "trait" },
          { tokens: ["DATA SQUAD"], match: "trait" },
        ],
      },
      orFilters: [{ kind: ["Tamer"], colors: ["Green"] }],
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [revealAdd] },
    { trigger: "WhenMoving", actions: [revealAdd] },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["DATA SQUAD"], cost: 0, isAlternate: true }],
};
registerIrCard("BT26-036", compiled);
