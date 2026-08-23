// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-170 AvengeKidmon.
// Replacement: when this card would be played, paying cost (return 3 [Three Musketeers]-text
// cards from trash to deck bottom) reduces play cost by 6.
// digivolutionRequirement.texts:["Three Musketeers"] covers "in text" — isAlternate is correct.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          // When this card would be played, paying the cost (return 3 Three-Musketeers-text cards
          // from trash to deck bottom) reduces the play cost by 6.
          // Single Replacement — no inner duplicate; the outer mode/amount IS the reduction.
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          mode: "reduceCost",
          amount: 6,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "text",
                  },
                ],
              },
              count: 3,
            },
            to: "deckBottom",
            raw: "by returning 3 cards with [Three Musketeers] in their texts from your trash to the bottom of the deck, reduce this card's play cost by 6",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 12,
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Three Musketeers"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-170", compiled);
