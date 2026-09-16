import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Option"],
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "placeUnder",
              underFilter: { isSelfRef: true },
            },
          ],
          rest: "deckTopOrBottom",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 3,
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect placed",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Option"],
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "placeUnder",
              underFilter: { isSelfRef: true },
            },
          ],
          rest: "deckTopOrBottom",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 3,
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect placed",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Three Musketeers"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-044", compiled);
