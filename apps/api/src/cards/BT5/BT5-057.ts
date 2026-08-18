// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "keywords": [
                "DigiBurst"
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": { "filter": { "isSelfRef": true, "zone": "digivolutionCards" }, "count": 3 },
            "raw": "＜Digi-Burst 3＞"
          },
          "abortOnDecline": true
        }
      ],
      "keywords": [
        {
          "keyword": "DigiBurst",
          "amount": 3,
          "raw": "＜Digi-Burst 3＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-057", compiled);
