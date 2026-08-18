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
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Angoramon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "NSp"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 2,
          "optional": true
        },
        {
          "kind": "UseOptionWithoutCost",
          "filter": {
            "controller": "mine",
            "kind": [
              "Option"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Angoramon"
                ],
                "match": "text"
              },
              {
                "tokens": [
                  "NSp"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 2,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
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
          "amount": 1000,
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
      "names": [
        "Angoramon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "level": 3,
      "traits": [
        "NSp"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX12-050", compiled);
