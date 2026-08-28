import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-063 Commandramon. The controller chooses both the top/bottom destination and
// the order of the unselected revealed cards.
export const compiled: CompiledCard = {
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
                    tokens: ["Chaosmon"],
                    match: "name",
                  },
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckTopOrBottom",
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
                    tokens: ["Chaosmon"],
                    match: "name",
                  },
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckTopOrBottom",
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
  digivolutionRequirement: [
    {
      names: ["Missimon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["ACCEL"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-063", compiled);
