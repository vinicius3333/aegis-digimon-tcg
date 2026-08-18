// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
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
            "nameOrTrait": [
              {
                "tokens": [
                  "ShineGreymon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 4,
          "ignoreRequirements": true,
          "optional": true,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 6
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hero"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "your opponent has a level 6 or higher Digimon or you have 3 or more [Hero] trait Tamers with different names"
          }
        }
      ]
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
      "names": [
        "Koromon"
      ],
      "cost": 0,
      "isAlternate": true
    },
    {
      "level": 2,
      "traits": [
        "Hero"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-040", compiled);
