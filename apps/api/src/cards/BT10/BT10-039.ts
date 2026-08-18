// @ts-nocheck
// hand-authored override: preserve the canonical Option-kind filter for UI/server candidates
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
          "kind": "UseOptionWithoutCost",
          "target": {
            "filter": {
              "kind": [
                "Option"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Plug-In"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "payCost": false,
          "optional": true,
          "waiveColorRequirement": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-039", compiled);
