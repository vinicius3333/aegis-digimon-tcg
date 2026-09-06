// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const protectedTarget = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["System"], match: "trait" },
      { tokens: ["Life"], match: "trait" },
      // The parenthetical is printed reminder text; the catalog trait identity is Transmutation.
      { tokens: ["Transmutation"], match: "trait" },
    ],
  },
  count: 1,
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: protectedTarget,
          restriction: "beReturned",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: protectedTarget,
          restriction: "beReturned",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
        },
      ],
    },
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
  // The printed second evolution circle is any-color Standard grade, cost 2.
  // The shared trait matcher includes forms, so Stnd. also matches the grade.
  digivolutionRequirement: [{ traits: ["Stnd."], cost: 2, isAlternate: false }],
};

registerIrCard("BT24-056", compiled);
