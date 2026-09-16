import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "by trashing 1 blue card in your hand",
          },
          optional: true,
          abortOnDecline: false,
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "by trashing a second blue card in your hand",
          },
          optional: true,
          abortOnDecline: false,
        },
        {
          effectTextPart:
            "Then, you may return 1 of your opponent’s Digimon with no digivolution cards to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "by trashing 1 blue card in your hand",
          },
          optional: true,
          abortOnDecline: false,
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          choose: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 1,
            },
            raw: "by trashing a second blue card in your hand",
          },
          optional: true,
          abortOnDecline: false,
        },
        {
          effectTextPart:
            "Then, you may return 1 of your opponent’s Digimon with no digivolution cards to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Blue"],
          },
          actions: [],
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
              from: ["trash"],
            },
            to: "deckBottom",
            raw: "by returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck in any order, prevent its deletion",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-016", compiled);
