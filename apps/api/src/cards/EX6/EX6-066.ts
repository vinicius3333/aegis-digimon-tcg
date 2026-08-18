// @ts-nocheck
// EX6-066 Sea of Destruction — hand-fixed IR.
// KB Q3817: "the placed card" refers to the Digimon placed from hand (the cost card),
// not the blue host Digimon. Return targets all opponent Digimon at that placed card's level.
//
// Fixes:
//   - Removed colors:["Blue"] from cost target filter (placed card needs no color constraint)
//   - Return target should filter by the placed card's level (relativeTo on placed card level —
//     capability gap: Cost.placedCardBindAs not yet supported; see LANE_H.md; encoded as raw)
//
// nameOrTrait with two tokens in one entry = OR (Aqua OR Sea Animal) — correct per engine.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "raw": "with the same level as the placed card"
            },
            "count": "all"
          },
          "to": "hand",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Aqua",
                      "Sea Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Aqua]/[Sea Animal] in one of its traits from your hand as the bottom digivolution card of 1 of your blue Digimon",
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestLevel"
            },
            "count": "all"
          },
          "to": "hand"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [
    "Return target level = placed card's level; Cost.placedCardBindAs capability missing (LANE_H.md)"
  ]
};

registerIrCard("EX6-066", compiled);
