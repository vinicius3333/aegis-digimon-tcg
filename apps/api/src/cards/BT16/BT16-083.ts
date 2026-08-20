// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "any",
              "kind": [
                "Tamer"
              ]
            },
            "count": "all"
          },
          "to": "hand"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "kind": [
                "Tamer"
              ]
            },
            "count": 1,
            "controller": "mine",
            "location": "hand"
          },
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ukkomon"
                  ],
                  "match": "name"
                }
              ],
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "controller": "mine",
            "location": "trash"
          },
          "from": [
            "trash"
          ],
          "payCost": false
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestLevel"
            },
            "count": 1
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "kind": [
                  "DigiEgg"
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 Digi-Egg card from your trash to the bottom of the Digi-Egg deck"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "breeding": true,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT16-083", compiled);
export { compiled };
