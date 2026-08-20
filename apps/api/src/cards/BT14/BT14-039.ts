// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Numemon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 Digimon card with [Numemon] in its name from your trash as this Digimon's bottom digivolution card",
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
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "selfHasNameContaining", "names": ["Monzaemon","Numemon"],
            "raw": "this Digimon has [Monzaemon] or [Numemon] in its name"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Numemon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT14-039", compiled);
