// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "isSelfRef": true
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Ice-Snow"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Ice-Snow"
          ]
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd"
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
        "Hiyarimon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-019", compiled);
