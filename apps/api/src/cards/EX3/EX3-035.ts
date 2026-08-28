// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Four Great Dragons"], match: "trait" }],
            },
            count: 1,
            forceSelection: true,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -6000,
          duration: "forTheTurn",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 2,
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Magnadramon"], match: "name" }],
                  },
                  count: 1,
                  upTo: true,
                  allowZero: true,
                },
                to: "deckBottom",
                stopIfZero: true,
              },
              {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Azulongmon"], match: "name" }],
                  },
                  count: 1,
                },
                to: "deckBottom",
              },
              {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Megidramon"], match: "name" }],
                  },
                  count: 1,
                },
                to: "deckBottom",
              },
            ],
            raw: "By returning 1 [Magnadramon], 1 [Azulongmon], and 1 [Megidramon] from your trash to the bottom of your deck in any order",
            orderReturnedCards: true,
          },
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-035", compiled);
