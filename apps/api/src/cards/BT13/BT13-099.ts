// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Yellow"
            ]
          },
          "actions": [
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
              "amount": -1000,
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {"isSelfRef": true}, "count": 1, "isSelf": true
          },
          "grant": "kind",
          "tokens": ["Digimon"],
          "staticEffect": {"kind": "SetBaseDP", "value": 3000},
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "totalSecurityCount",
            "op": "lte",
            "value": 6,
            "raw": "there're 6 or fewer total cards in both players' security stacks"
          }
        },
        {
          "kind": "Restrict",
          "target": {"filter": {"isSelfRef": true}, "count": 1, "isSelf": true},
          "restriction": "digivolve",
          "duration": "untilOpponentTurnEnd",
          "condition": {"kind": "totalSecurityCount", "op": "lte", "value": 6}
        },
        {
          "kind": "GainKeyword",
          "target": {"filter": {"isSelfRef": true}, "count": 1, "isSelf": true},
          "keyword": {"keyword": "Blocker", "raw": "＜Blocker＞"},
          "duration": "untilOpponentTurnEnd",
          "condition": {"kind": "totalSecurityCount", "op": "lte", "value": 6}
        }
      ],
      "frequency": "OncePerTurn"
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

registerIrCard("BT13-099", compiled);
