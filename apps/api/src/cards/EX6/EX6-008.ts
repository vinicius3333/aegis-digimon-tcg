// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
                levelComparison: { op: "eq", value: 4 },
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
              raw: "and placing this card as the bottom digivolution card of 1 of your Digimon that's level 4 or has the [Legend-Arms] trait",
            },
          ],
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
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "Raid",
                raw: "＜Raid＞",
              },
              duration: "forTheTurn",
            },
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
                keyword: "Piercing",
                raw: "＜Piercing＞",
              },
              duration: "forTheTurn",
            },
          ],
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
      level: 3,
      traits: ["Legend-Arms"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-008", compiled);
