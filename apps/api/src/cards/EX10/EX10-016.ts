// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "isLinked": true,
      "actions": [
        {
          "kind": "Suspend",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon"] }, "count": 2 },
          "cost": {
            "kind": "trash",
            "target": { "filter": { "controller": "mine", "kind": ["Digimon"], "zone": "linked" }, "count": 1 },
            "raw": "By trashing 1 of this Digimon's link cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "traits": [
        "Appmon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

export { compiled };

registerIrCard("EX10-016", compiled);
