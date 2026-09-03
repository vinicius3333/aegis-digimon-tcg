import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-102 Sayo
// Fix: [Your Turn] SubTrigger actions were empty; corrected to Digivolve from trash
//   with cost reduction 2. sourceFilter checks attacking Digimon has same-level stack.
//   Q4977: "2 or more cards with the same level among all stacked cards" (minCount: 2).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            stackHasSameLevelCards: 2,
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isTriggerSource: true,
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Night Claw", "Light Fang", "Galaxy", "CS"],
                    match: "trait",
                  },
                ],
              },
              from: ["trash"],
              payCost: true,
              costDelta: -2,
              optional: true,
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          raw: "When one of your Digimon with 2 or more same-level cards in its stack attacks, by suspending this Tamer, digivolve it into a Digimon card with the [Night Claw], [Light Fang], [Galaxy] or [CS] trait in the trash with the digivolution cost reduced by 2",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-102", compiled);
