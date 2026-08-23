// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q4181: the "by returning 3 cards" cost must be fulfilled in full (all 3 cards must be returned).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              colors: ["Blue"],
            },
            count: 3,
            upTo: true,
          },
          optional: true,
          trackCount: "blueCardsTrashed",
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          amount: 1,
          optional: true,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "blueCardsTrashed",
            count: 1,
            raw: "1 or more blue cards were trashed by this effect",
          },
          scaling: {
            per: 1,
            filter: {},
            unit: "namedCount",
            countSource: "blueCardsTrashed",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          restriction: "beSuspended",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
            },
          ],
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Jellymon"],
                    match: "text",
                  },
                ],
              },
              count: 3,
            },
            to: "deckBottom",
            raw: "by returning 3 cards with [Jellymon] in their text from your trash to the bottom of your deck",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-089", compiled);
