// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-052 Oblivimon:
// [Security][End of Opponent's Turn] Play this card without paying the cost.
// [When Digivolving] Flip your opponent's top face-down security card face-up.
// [Your Turn] When your Digimon checks a face-up security card, you may place
//   the top card of this Digimon face-up at the bottom of the security stack.
// [Your Turn][Inherited] This Digimon's attack target can't be switched.
//
// KB Q4375: flipFaceUp targets the next face-down card (from top), not a specified one.
// KB Q4381: placing top card to security bottom triggers end-of-attack effects.
//
// Migration note: the face-up gate was originally encoded as a raw fireCondition on a
// "whenChecksSecurity" SubTrigger — a name declared in SubTriggerEventName but never fired
// anywhere. The already-live "whenCheckedFaceUpSecurity" event covers exactly this case
// natively (securityCheck.ts fires it precisely when the checked card was ALREADY face-up),
// so the raw workaround condition is gone and the event is renamed.

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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          sourceFilter: {
            controllerDefault: "mine",
          },
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
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attackTargetChange",
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
      level: 4,
      traits: ["Cyborg", "Machine"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-052", compiled);
