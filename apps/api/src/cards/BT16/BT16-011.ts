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
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red"
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": false
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
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Garudamon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Garudamon] or [X Antibody] is in this Digimon's digivolution cards"
          },
          "optional": false
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                "Red"
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
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
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Garudamon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Garudamon] or [X Antibody] is in this Digimon's digivolution cards"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenCardReturnsFromTrashToHand",
          "sourceFilter": {
            "controllerDefault": "mine",
            "colors": [
              "Red"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Rush",
                "raw": "＜Rush＞"
              },
              "duration": "forTheTurn"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Garudamon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-011", compiled);
export { compiled };
