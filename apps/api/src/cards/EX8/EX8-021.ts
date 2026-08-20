// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Jamming",
          "raw": "＜Jamming＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "DS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-021", compiled);
