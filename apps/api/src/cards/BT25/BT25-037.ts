import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          effectTextPart:
            "Then, you may place 1 [Angel], [Archangel], [Three Great Angels] or [Iliad] trait Digimon card or 1 [TS] trait Tamer card from your hand as the top or bottom security card.",
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          amount: 1,
          source: "hand",
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Iliad"], match: "trait" }],
            orFilters: [
              { controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          effectTextPart:
            "Then, you may place 1 [Angel], [Archangel], [Three Great Angels] or [Iliad] trait Digimon card or 1 [TS] trait Tamer card from your hand as the top or bottom security card.",
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          amount: 1,
          source: "hand",
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Iliad"], match: "trait" }],
            orFilters: [
              { controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
            ],
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-037", compiled);
