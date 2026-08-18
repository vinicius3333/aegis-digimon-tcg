// @ts-nocheck
// HAND-FIXED IR — the inherited battle watcher must be anchored to its host.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 3000
              }
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "suspended": true,
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "restriction": "unsuspend",
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-037", compiled);
