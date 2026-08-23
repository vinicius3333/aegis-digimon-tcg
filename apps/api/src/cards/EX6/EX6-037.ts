// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The [Hand][Main] clause's cost was auto-generated as a raw string with no structured
// destination filter (same defect fixed on EX6-007/EX6-009). It is now structured:
//   - cost: payMemory(1) — "By paying 1 cost".
//   - additionalCosts: a "place" cost that moves THIS card (isSelfRef, from hand) under a
//     chosen destination Digimon matching level 3 OR the [Legend-Arms] trait (underFilter +
//     underOrFilters). Unlike EX6-007/EX6-009, the Draw doesn't reference the destination
//     Digimon, so no bindHostAs/fromSelectionRef is needed.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "payMemory",
            memory: 1,
            raw: "By paying 1 cost",
          },
          additionalCosts: [
            {
              kind: "place",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                from: ["hand"],
              },
              underFilter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "eq", value: 3 },
              },
              underOrFilters: [
                {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }],
                },
              ],
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
              raw: "and placing this card as the bottom digivolution card of 1 of your Digimon that's level 3 or has the [Legend-Arms] trait",
            },
          ],
          raw: "By paying 1 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 3 or has the [Legend-Arms] trait, ＜Draw 1＞",
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Legend-Arms"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Legend-Arms] trait in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuttomon", "Kakkinmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-037", compiled);
