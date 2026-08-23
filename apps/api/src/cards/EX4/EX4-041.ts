// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX4-041 (DeadlyAxemon).
// runtime-effect fixes:
// - [On Play] Draw: the cost+abortOnDecline pattern already gates the Draw on paying the trash
//   cost correctly; this was already faithfully encoded.
// - [On Deletion] RevealAdd: add filter must restrict to cards with [Blue Flare] or [Twilight]
//   trait. Text says "If that card has the [Blue Flare] or [Twilight] trait, add it to your hand.
//   Trash the rest." — added nameOrTrait match:"trait" with tokens ["Blue Flare","Twilight"].
// - Inherited [All Turns] ModifyDP +1000 permanent (for each digivolution card gained) preserved.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Blue Flare] or [Twilight] trait in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "AllTurns",
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
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-041", compiled);
