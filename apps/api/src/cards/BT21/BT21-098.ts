// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR correction: the Delay payload is nested under the Galacticmon
// attack watcher, and the fallback security trash leaves exactly 1 security card.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestPlayCost"
            },
            "count": 1
          }
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Galacticmon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "superlative": "lowestPlayCost"
                },
                "count": 1
              },
            },
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "leaveCount": 1,
              "condition": {
                "kind": "ifThisEffectDidNotDelete"
              }
            }
          ],
          "raw": "whenAttacking"
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 6,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vemmon"
                  ],
                  "match": "any"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT21-098", compiled);
