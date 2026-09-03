import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: De-Digivolve 2, flip opponent's top face-down security card
// face up, then delete 1 of opponent's Digimon with 1 or fewer digivolution cards.
// [Your Turn] (inherited context): when your Digimon checks a face-up security card,
// you may place the top card of this Digimon face-up at the bottom of your security stack.
// Capabilities needed: see LANE_H.md
//   - Filter.digivolutionCardsAtMost: number (for "1 or fewer digivolution cards")
//   - SubTrigger event "whenCheckedFaceUpSecurity" (for "when your Digimon checks a face-up security card")
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
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
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
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
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
