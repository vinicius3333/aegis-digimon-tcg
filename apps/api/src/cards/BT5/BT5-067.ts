// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": []
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
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
        "Keramon"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT5-067", compiled);
