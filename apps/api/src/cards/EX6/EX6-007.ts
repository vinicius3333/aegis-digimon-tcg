import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX6-007 (Zubamon; Red Lv.3 Digimon).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "placementTarget",
            filter: {},
            count: 1,
          },
          amount: 4000,
          duration: "forTheTurn",
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
              bindHostAs: "placementTarget",
              raw: "and placing this card as the bottom digivolution card of 1 of your Digimon that's level 3 or has the [Legend-Arms] trait",
            },
          ],
          raw: "By paying 1 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 3 or has the [Legend-Arms] trait, that Digimon gets +4000 DP for the turn.",
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
          raw: "onAddDigivolutionCards",
        },
      ],
      frequency: "OncePerTurn",
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
  digivolutionRequirement: [
    {
      names: ["Sakuttomon", "Kakkinmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-007", compiled);
