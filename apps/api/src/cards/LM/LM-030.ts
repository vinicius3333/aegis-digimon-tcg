// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Green"
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 3,
          "ignoreRequirements": false,
          "optional": true
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "StartOfYourTurn",
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ],
      "condition": {
        "kind": "opponentHas",
        "filter": {
          "controllerDefault": "opponent",
          "kind": [
            "Digimon"
          ]
        },
        "raw": "your opponent has a Digimon"
      },
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ]
            },
            "count": 1
          },
          "to": "deckTop",
          "mandatory": true
        },
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
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "you don't have a Digimon"
          },
          "optional": true
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
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ],
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": [
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

registerIrCard("LM-030", compiled);
