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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 7000
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gammamon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Gammamon] in its text from your hand as this Digimon's bottom digivolution card",
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
              "dp": {
                "op": "lte",
                "value": 7000
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gammamon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Gammamon] in its text from your hand as this Digimon's bottom digivolution card",
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Gammamon"
                ],
                "match": "text"
              }
            ]
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "controllerDefault": "mine",
                    "kind": [
                      "Digimon"
                    ]
                  },
                  "count": 3
                },
                "raw": "by trashing 3 Digimon cards from its digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Gammamon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-022", compiled);
