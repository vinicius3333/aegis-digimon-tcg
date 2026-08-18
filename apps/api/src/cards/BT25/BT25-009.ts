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
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "excludeNameOrTrait": [
              {
                "tokens": [
                  "Sea Animal"
                ],
                "match": "trait"
              }
            ],
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Beast",
                  "Animal",
                  "Sovereign"
                ],
                "match": "trait"
              },
              {
                "tokens": [
                  "TS"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "condition": {
            "kind": "memoryAtLeast",
            "value": 4
          }
        }
      ]
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
      "level": 2,
      "traits": [
        "TS"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-009", compiled);
