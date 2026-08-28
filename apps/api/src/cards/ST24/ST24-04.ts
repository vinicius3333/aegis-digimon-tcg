// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for ST24-04 (Agumon).
// Fix: RevealAdd must include TWO disposition entries:
//   1. add 1 [DATA SQUAD] trait card to hand
//   2. place 1 [DATA SQUAD] trait card face-down under any of your [DATA SQUAD] Tamers
// KB Q6207: the placed card goes to the bottom of any existing cards under the Tamer.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "placeUnder",
              underFilter: {
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              faceDown: true,
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "placeUnder",
              underFilter: {
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["DATA SQUAD"],
                    match: "trait",
                  },
                ],
              },
              faceDown: true,
            },
          ],
          rest: "deckBottom",
        },
      ],
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
      names: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-04", compiled);
