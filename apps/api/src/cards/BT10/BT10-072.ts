// HAND-AUTHORED OVERRIDE — maintained as a direct implementation (the AUTO-GENERATED header is
// intentionally removed). The runtime record double-emitted "...＜Draw 1＞. (Draw 1 card from
// your deck.)" as a cost-bearing Draw plus a bare Draw from the reminder text, so the card
// drew 2. This carries the corrected single cost-bearing Draw 1.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon"],
                colors: ["Purple"],
              },
              count: 1,
              from: ["hand"],
            },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              excludeToken: true,
            },
            raw: "By placing 1 purple Digimon card from your hand under one of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: {
            isSelfRef: true,
          },
          requireByEffect: true,
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-072", compiled);
