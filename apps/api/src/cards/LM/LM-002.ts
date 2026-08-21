// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 7,
            "raw": "you have 7 or fewer cards in your hand"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("LM-002", compiled);
