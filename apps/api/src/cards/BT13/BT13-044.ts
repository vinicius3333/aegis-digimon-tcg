// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
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
          "amount": -6000,
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "By trashing the top card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "colors": [
                    "Yellow"
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
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-044", compiled);
