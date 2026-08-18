// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT6-054 (AncientTroymon).
// Fixes:
// 1. Suspend target: text says "without <Blocker>" — excludeKeywords:["Blocker"]
//    and controller:"opponent" ensure only their non-Blocker Digimon qualify.
// 2. PlayWithoutCost target: added nameOrTrait for "Hybrid" form filter — text says
//    "with Hybrid in its form" (Hybrid is a Form trait in card data).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "excludeKeywords": [
                    "Blocker"
                  ]
                },
                "count": 2,
                "upTo": true
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-054", compiled);
