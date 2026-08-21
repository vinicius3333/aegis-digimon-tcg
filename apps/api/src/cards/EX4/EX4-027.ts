// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [{ "keyword": "Armor Purge", "raw": "＜Armor Purge＞" }]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -2000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "restriction": "attackOrBlock",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "or",
            "conditions": [
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "colors": [
                    "Blue",
                    "Yellow"
                  ]
                },
                "raw": "you have a blue or yellow Tamer in play"
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "trash",
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Armor Form"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "raw": "you have a card with the [Armor Form] trait in your trash"
              }
            ]
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Veemon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX4-027", compiled);
