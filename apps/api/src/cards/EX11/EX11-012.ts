import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
        {
          keyword: "Progress",
          raw: "＜Progress＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [End of Attack] You may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, by returning 1 card from your opponent's trash to the bottom of the deck, they play 1 [Petrification] Token. (Digimon/White/3000 DP/",
          kind: "PlayToken",
          tokens: ["Petrification Token"],
          count: 1,
          payCost: false,
          controller: "mine",
          placedAs: "opponentDigimon",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
              },
              count: 1,
            },
            to: "deckBottom",
            raw: "by returning 1 card from your opponent's trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [End of Attack] You may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, by returning 1 card from your opponent's trash to the bottom of the deck, they play 1 [Petrification] Token. (Digimon/White/3000 DP/",
          kind: "PlayToken",
          tokens: ["Petrification Token"],
          count: 1,
          payCost: false,
          controller: "mine",
          placedAs: "opponentDigimon",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
              },
              count: 1,
            },
            to: "deckBottom",
            raw: "by returning 1 card from your opponent's trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
            },
          ],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                isToken: true,
              },
              count: 1,
            },
            raw: "by deleting 1 Token, it doesn't leave",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-012", compiled);
