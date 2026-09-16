import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          scope: "acrossDigimon",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          amount: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 4,
              upTo: true,
            },
            raw: "You may trash up to 4 blue cards in your hand",
          },
          scaling: {
            per: 1,
            unit: "cards",
            usePaidCount: true,
          },
          raw: "For each one, trash any 1 card under your opponent's Digimon or Tamers",
        },
        {
          effectTextPart: "Then, return 1 of their Digimon or Tamers without cards under it to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          scope: "acrossDigimon",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          amount: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 4,
              upTo: true,
            },
            raw: "You may trash up to 4 blue cards in your hand",
          },
          scaling: {
            per: 1,
            unit: "cards",
            usePaidCount: true,
          },
          raw: "For each one, trash any 1 card under your opponent's Digimon or Tamers",
        },
        {
          effectTextPart: "Then, return 1 of their Digimon or Tamers without cards under it to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
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
            raw: "By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-005", compiled);
