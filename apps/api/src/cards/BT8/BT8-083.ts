// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Myotismon"],
                  match: "name",
                },
              ],
            },
            count: 5,
            raw: "there are 5 or more cards with [Myotismon] in their names in your trash",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Myotismon"],
                  match: "name",
                },
              ],
            },
            count: 5,
            raw: "there are 5 or more cards with [Myotismon] in their names in your trash",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 5,
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Myotismon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            raw: "there's a card with [Myotismon] in its name in your trash",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-083", compiled);
