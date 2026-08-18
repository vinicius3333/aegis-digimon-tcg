// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              "suspended": true,
              "kind": [
                "Digimon"
              ],
              "dp": {
                "lte": {
                  "kind": "dpOfChosen",
                  "chosenBy": {
                    "filter": {
                      "controller": "mine",
                      "kind": [
                        "Digimon"
                      ]
                    },
                    "count": 1
                  }
                }
              }
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Leopardmon: Leopard Mode"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by returning the top card of one of your [Leopardmon: Leopard Mode] to the hand"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
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

registerIrCard("BT13-107", compiled);
