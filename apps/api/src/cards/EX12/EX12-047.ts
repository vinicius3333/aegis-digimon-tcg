import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Ascension",
          raw: "＜Ascension＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's lowest DP Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, by returning 2 cards from their trash to the bottom of the deck, for the turn, this Digimon gets +6000 DP and, to 1 of their Digimon, give -5000 DP for each of those returned cards' colors.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 6000,
          duration: "forTheTurn",
          abortOnDecline: true,
          cost: {
            kind: "return",
            optional: true,
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
              },
              count: 2,
            },
            trackColors: "returnedCardColors",
            raw: "by returning 2 cards from their trash to the bottom of the deck",
          },
        },
        {
          effectTextPart:
            "Then, by returning 2 cards from their trash to the bottom of the deck, for the turn, this Digimon gets +6000 DP and, to 1 of their Digimon, give -5000 DP for each of those returned cards' colors.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            countSource: "returnedCardColors",
            unit: "namedCount",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's lowest DP Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, by returning 2 cards from their trash to the bottom of the deck, for the turn, this Digimon gets +6000 DP and, to 1 of their Digimon, give -5000 DP for each of those returned cards' colors.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 6000,
          duration: "forTheTurn",
          abortOnDecline: true,
          cost: {
            kind: "return",
            optional: true,
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
              },
              count: 2,
            },
            trackColors: "returnedCardColors",
            raw: "by returning 2 cards from their trash to the bottom of the deck",
          },
        },
        {
          effectTextPart:
            "Then, by returning 2 cards from their trash to the bottom of the deck, for the turn, this Digimon gets +6000 DP and, to 1 of their Digimon, give -5000 DP for each of those returned cards' colors.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            countSource: "returnedCardColors",
            unit: "namedCount",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart: "[On Deletion] You may return 1 [TB] trait card from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["TB"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 level 5 or lower [TB] trait Digimon card from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["TB"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
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
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-047", compiled);
