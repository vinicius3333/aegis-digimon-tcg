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
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "they didn't"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "they didn't"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Syakomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-066", compiled);
export { compiled };
