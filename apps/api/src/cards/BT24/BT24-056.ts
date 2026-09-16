import type { CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const protectedTarget: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["System"], match: "trait" },
      { tokens: ["Life"], match: "trait" },
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
  digivolutionRequirement: [{ traits: ["Stnd."], cost: 2, isAlternate: false }],
};

registerIrCard("BT24-056", compiled);
