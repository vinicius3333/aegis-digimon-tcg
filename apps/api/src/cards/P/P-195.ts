// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "PlayWithoutCost",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Elecmon"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "from": [
                  "hand"
                ],
                "payCost": false,
                "optional": true
              }
            ],
            [
              {
                "kind": "Digivolve",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "kind": [
                      "Digimon"
                    ]
                  },
                  "count": 1
                },
                "into": {
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Aegiomon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "payCost": false,
                "from": [
                  "hand"
                ],
                "optional": true
              }
            ]
          ]
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-195", compiled);
