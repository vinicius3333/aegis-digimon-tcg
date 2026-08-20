// @ts-nocheck
// HAND-FIXED IR — do not regenerate
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
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Abbadomon Core"
                  ],
                  "match": "name"
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
          "requiresEmpty": "breedingArea",
          "breeding": true,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": [
                "trash",
                "digivolutionCards"
              ],
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Negamon"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 4
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Abbadomon Core"
                  ],
                  "match": "name"
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
          "requiresEmpty": "breedingArea",
          "breeding": true,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": [
                "trash",
                "digivolutionCards"
              ],
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Negamon"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 4
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "EndOfAllTurns",
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
                "op": "eq",
                "value": 0,
                "scaling": {
                  "per": 1,
                  "unit": "namedCount",
                  "countSource": "ex9055PlacedLevel"
                }
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 6
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Negamon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 level 6 or lower Digimon card with [Negamon] in its text from your trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self",
            "storeAs": "ex9055PlacedLevel"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX9-055", compiled);
