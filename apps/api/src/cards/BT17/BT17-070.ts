// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "levels": [
                  5
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Dark Masters"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 level 5 card with [Dark Masters] in its text from your hand or trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "levels": [
                  5
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Dark Masters"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 level 5 card with [Dark Masters] in its text from your hand or trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "opponent"
              },
              "count": 7
            },
            "raw": "By returning 7 cards from your opponent's trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "texts": [
        "Dark Masters"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-070", compiled);
