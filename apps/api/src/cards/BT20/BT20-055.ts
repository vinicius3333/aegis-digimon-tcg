import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfOpponentsTurn",
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
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon and flip your opponent's top face-down security card face up.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon and flip your opponent's top face-down security card face up.",
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon with 1 or fewer digivolution cards.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
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
          effectTextPart:
            "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon and flip your opponent's top face-down security card face up.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon and flip your opponent's top face-down security card face up.",
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon with 1 or fewer digivolution cards.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
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
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              source: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              faceUp: true,
              detachPermanentTop: true,
            },
          ],
          optional: true,
          raw: "when your Digimon checks a face-up security card, you may place the top card of this Digimon face-up at the bottom of your security stack",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-055", compiled);
