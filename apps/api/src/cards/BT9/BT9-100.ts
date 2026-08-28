// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT9-100 (Grandis Scissor).
//
// Audit fixes:
//
// 1. Unsuspend is now the trigger for an Attack action on the same Digimon
//    (using selectionRef to bind which Insectoid was unsuspended then attack with it).
//    The Unsuspend and Attack are sequenced: the Digimon unsuspended attacks and
//    suspends normally as part of declaring that new attack.
//
// `attackPlayer:false` restricts the forced attack to an opponent Digimon (Q1904),
// while forceAttack reuses canonical target legality and therefore excludes a
// "can't be attacked" defender (Q1905).

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Insectoid"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "unsuspendedInsectoid",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "unsuspendedInsectoid",
          },
          attackPlayer: false,
          raw: "it attacks your opponent's Digimon",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-100", compiled);
