// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const qualifying = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Evil"], match: "trait" },
    { tokens: ["Dark Dragon"], match: "trait" },
    { tokens: ["Evil Dragon"], match: "trait" },
    { tokens: ["Dark Knight"], match: "trait" },
  ],
};
const qualifyingTamer = { controllerDefault: "mine", kind: ["Tamer"], colors: ["Purple"] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: qualifying, orFilters: [qualifyingTamer], count: 1, to: "hand" },
            { filter: qualifying, orFilters: [qualifyingTamer], count: 1, to: "trash", requiresMinRevealed: 2 },
          ],
          rest: "deckBottom",
        },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Gigimon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT24-066", compiled);
