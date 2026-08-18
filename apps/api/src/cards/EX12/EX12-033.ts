// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 3,
            "upTo": true
          },
          "optional": true
        },
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
          "amount": -4000,
          "duration": "untilYourTurnEnd",
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 3,
            "upTo": true
          },
          "optional": true
        },
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
          "amount": -4000,
          "duration": "untilYourTurnEnd",
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "Counter",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 3,
            "upTo": true
          },
          "optional": true
        },
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
          "amount": -4000,
          "duration": "untilYourTurnEnd",
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
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
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Jellymon"
                ],
                "match": "text"
              },
              {
                "tokens": [
                  "DS"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
              "cost": {
                "kind": "return",
                "target": {
                  "filter": {
                    "controller": "mine"
                  },
                  "count": 3
                },
                "raw": "by returning 3 cards from your trash to the bottom of the deck"
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "texts": [
        "Jellymon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "DS"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 5
    }
  ]
};

registerIrCard("EX12-033", compiled);
