import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [On Deletion] You may place 1 Digimon card with the [Angel]/[Archangel]/[Three Great Angels] trait from your hand at the bottom of your security stack.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if you have 4 or more security cards, add the top card of your security stack to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "securityAtLeast",
            value: 4,
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[On Play] [On Deletion] You may place 1 Digimon card with the [Angel]/[Archangel]/[Three Great Angels] trait from your hand at the bottom of your security stack.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if you have 4 or more security cards, add the top card of your security stack to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "securityAtLeast",
            value: 4,
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Angel"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Recovery",
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Angel"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-038", compiled);
