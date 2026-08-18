// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "payMemory",
            "memory": 1,
            "raw": "By paying 1 cost"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT24-002", compiled);
