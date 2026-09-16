import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            raw: "your opponent doesn't have a level 4 or lower Digimon in play",
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
            colors: ["Purple"],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When one of your purple Digimon attacks, you may suspend this Tamer to trigger ＜Draw 1＞. (Draw 1 card from your deck.)",
              kind: "Suspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              effectTextPart:
                "[Your Turn] When one of your purple Digimon attacks, you may suspend this Tamer to trigger ＜Draw 1＞. (Draw 1 card from your deck.)",
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              effectTextPart: "Then, trash 1 card in your hand.",
              kind: "Trash",
              target: {
                filter: {
                  controller: "mine",
                  zone: "hand",
                },
                count: 1,
              },
            },
          ],
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

registerIrCard("BT6-091", compiled);
