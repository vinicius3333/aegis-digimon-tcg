import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] trash the top 2 digivolution cards of all of your opponent's Digimon. If this effect didn't trash, you may play 1 level 4 or lower Digimon card with the [Ice-Snow] trait from your hand without paying the cost.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2,
          fromTop: true,
        },
        {
          effectTextPart:
            "[Main] trash the top 2 digivolution cards of all of your opponent's Digimon. If this effect didn't trash, you may play 1 level 4 or lower Digimon card with the [Ice-Snow] trait from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Ice-Snow"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "this effect didn't trash",
          },
          optional: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-067", compiled);
