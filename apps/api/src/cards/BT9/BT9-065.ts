// @ts-nocheck
// HAND-FIXED — preserve: inherited deletion checks the live host's Machine/Dragonkin traits.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "playCostLte": 3
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "playCostLte": 3
            },
            "count": 1
          },
          "condition": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": ["Machine", "Dragonkin"],
                  "match": "trait"
                }
              ]
            }
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-065", compiled);
