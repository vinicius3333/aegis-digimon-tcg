import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
                    tokens: ["Three Musketeers"],
                    match: "text",
                  },
                ],
              },
              count: 1,
              to: "hand",
              orDispositions: [
                {
                  to: "placeUnder",
                  filter: {
                    nameOrTrait: [
                      {
                        tokens: ["Three Musketeers"],
                        match: "trait",
                      },
                    ],
                  },
                  underFilter: {
                    isSelfRef: true,
                  },
                },
              ],
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
                    tokens: ["Three Musketeers"],
                    match: "text",
                  },
                ],
              },
              count: 1,
              to: "hand",
              orDispositions: [
                {
                  to: "placeUnder",
                  filter: {
                    nameOrTrait: [
                      {
                        tokens: ["Three Musketeers"],
                        match: "trait",
                      },
                    ],
                  },
                  underFilter: {
                    isSelfRef: true,
                  },
                },
              ],
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      colors: ["Purple"],
      cost: 0,
      isAlternate: false,
    },
    {
      level: 2,
      texts: ["Three Musketeers"],
      cost: 0,
      isAlternate: true,
    },
    {
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
      level: 2,
    },
  ],
};

registerIrCard("BT25-078", compiled);
