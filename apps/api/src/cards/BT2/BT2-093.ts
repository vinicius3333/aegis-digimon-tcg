// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: Delete 1 of your opponent's Digimon with 5000 DP or less.
// If you have a red Tamer in play, delete 1 with 8000 DP or less INSTEAD (not an additional option).
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
              "dp": {
                "op": "lte",
                "value": 8000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Red"
              ]
            },
            "raw": "you have a red Tamer in play"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Red"
              ]
            },
            "raw": "you don't have a red Tamer in play"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-093", compiled);
