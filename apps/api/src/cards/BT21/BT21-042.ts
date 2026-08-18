// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Marcus Damon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "colors": [
                  "Yellow"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "RizeGreymon"
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
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": [
        "Agumon"
      ],
      "traits": [
        "Dinosaur"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-042", compiled);
