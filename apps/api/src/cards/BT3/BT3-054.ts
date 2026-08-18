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
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "mode": "reduceCost",
          "amount": 3,
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "optional": true
          },
          "raw": "＜Digisorption -3＞"
        }
      ],
      "keywords": [
        {
          "keyword": "Digisorption",
          "amount": -3,
          "raw": "＜Digisorption -3＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT3-054", compiled);
