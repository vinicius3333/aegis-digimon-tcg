// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-016 Amphimon — hand-fixed IR.
// [When Digivolving][When Attacking] You may trash up to 2 blue cards in your hand.
//   For each one, trash any 1 card under your opponent's Digimon or Tamers.
//   Then, you may return 1 of your opponent's Digimon with no digivolution cards to the
//   bottom of the deck.
// [All Turns][Once Per Turn] When one of your blue Digimon would be deleted,
//   by returning 3 cards with [Jellymon] in their texts from your trash to the bottom
//   of the deck in any order, prevent its deletion.
//
// KB Q4093: trashing 2 blue cards lets you choose 2 separate targets (one per card).
// KB Q4094: player may choose ANY card from among the cards under the target permanent.
//
// Encoding: two independent optional TrashDigivolution actions, each with a trash-1-blue
// cost. The player may pay each independently (trash 0, 1, or 2 blue cards total).
// TrashDigivolution's choose:true lets the controller pick any card from the target's
// stack (KB Q4094), rather than a deterministic fromTop/fromBottom slice.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          // First: by trashing 1 blue card, trash 1 card under opponent's Digimon/Tamer.
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
          // Second: by trashing another blue card, trash 1 more card under opponent's Digimon/Tamer.
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
      // [All Turns][Once Per Turn] When one of your blue Digimon would be deleted,
      // by returning 3 cards with [Jellymon] in their texts from your trash to the
      // bottom of the deck in any order, prevent its deletion.
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
