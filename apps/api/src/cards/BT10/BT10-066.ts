// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "condition": {
            "kind": "digiXrosCount",
            "minimum": 2,
            "raw": "DigiXrosing with 2 cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBeDeleted",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "SkullKnightmon",
                        "DeadlyAxemon"
                      ],
                      "match": "nameExact"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "digivolutionCards"
              ],
              "payCost": false,
              "cost": {
                "kind": "return",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "colors": [
                      "Black"
                    ],
                    "levelComparison": {
                      "op": "lte",
                      "value": 4
                    }
                  },
                  "count": 1
                },
                "raw": "by returning 1 black level 4 or lower Digimon card from this Digimon's digivolution cards to its owner's hand"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "SkullKnightmon"
          ]
        },
        {
          "names": [
            "DeadlyAxemon"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("BT10-066", compiled);
