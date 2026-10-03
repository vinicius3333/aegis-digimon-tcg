import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
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
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [On Deletion] If your opponent has 10 or fewer cards in their trash, trash the top 3 cards of both players' decks.",
          kind: "TrashTopDeck",
          controller: "both",
          amount: 3,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "lte",
            value: 10,
            raw: "your opponent has 10 or fewer cards in their trash",
          },
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3 or lower Digimon. If your opponent has 10 or more cards in their trash, add 2 to this effect's level maximum.",
          kind: "ConditionalBranch",
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
          ifTrue: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
            },
          ],
          ifFalse: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 3 } },
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [On Deletion] If your opponent has 10 or fewer cards in their trash, trash the top 3 cards of both players' decks.",
          kind: "TrashTopDeck",
          controller: "both",
          amount: 3,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "lte",
            value: 10,
            raw: "your opponent has 10 or fewer cards in their trash",
          },
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3 or lower Digimon. If your opponent has 10 or more cards in their trash, add 2 to this effect's level maximum.",
          kind: "ConditionalBranch",
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
          ifTrue: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
            },
          ],
          ifFalse: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 3 } },
                count: 1,
              },
            },
          ],
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
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "gt",
            value: 10,
            raw: "your opponent has more than 10 cards in their trash",
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "lte",
            value: 10,
            raw: "your opponent has 10 or fewer cards in their trash",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-049", compiled);

export { compiled };
