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
const playAppmon = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controller: "mine",
      zone: "trash",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
    },
    count: 1,
  },
  from: ["trash"],
  payCost: false,
  optional: true,
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
        playAppmon,
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
        playAppmon,
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
  appFusionRequirement: [{ names: ["Hackmon", "Protecmon", "Pipomon"], cost: 0 }],
  linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
};

registerIrCard("BT24-056", compiled);
