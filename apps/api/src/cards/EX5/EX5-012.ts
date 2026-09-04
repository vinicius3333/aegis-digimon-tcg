// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX5-012 Flaremon
// Text: "When this card would be played or digivolved into, if you have a Digimon with 3 or
//   more digivolution cards and the [Light Fang]/[Night Claw]/[Galaxy] trait, reduce the
//   play or digivolution cost by 2."
// Text: "[On Play][When Digivolving] Delete 1 of your opponent's Digimon with 5000 DP or less."
// Text: "[Inherited][Your Turn] This Digimon gets +2000 DP."
// KB Q3549: reduces cost only when this card is being PLAYED or digivolved INTO — not when
//   this card digivolves into another card.
// Fixes:
//   - Add "wouldBePlayed" event for play cost reduction (already had this)
//   - Add separate "wouldDigivolve" Replacement for digivolution cost reduction
//   - Add digivolutionCardCount: gte 3 to the youHave condition filter
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Light Fang", "Night Claw", "Galaxy"],
                      match: "trait",
                    },
                  ],
                  digivolutionCardsAtLeast: 3,
                },
                raw: "you have a Digimon with 3 or more digivolution cards and the [Light Fang]/[Night Claw]/[Galaxy] trait",
              },
            },
          ],
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Light Fang", "Night Claw", "Galaxy"],
                      match: "trait",
                    },
                  ],
                  digivolutionCardsAtLeast: 3,
                },
                raw: "you have a Digimon with 3 or more digivolution cards and the [Light Fang]/[Night Claw]/[Galaxy] trait",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-012", compiled);
