import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Delete 1 of your opponent’s Digimon with the lowest play cost.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
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
            nameOrTrait: [
              {
                tokens: ["Galacticmon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestPlayCost",
                },
                count: 1,
              },
            },
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              leaveCount: 1,
              condition: {
                kind: "ifThisEffectDidNotDelete",
              },
            },
          ],
          raw: "whenAttacking",
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 card with [Vemmon] in its text and a play cost of 6 or less from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // "Play" only ever puts a Digimon or Tamer into the battle area; Option cards
              // are USED, never played, so a kind-less filter would wrongly offer them.
              kind: ["Digimon", "Tamer"],
              playCostLte: 6,
              nameOrTrait: [
                {
                  tokens: ["Vemmon"],
                  match: "any",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-098", compiled);
