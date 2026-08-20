// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 6
              }
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect suspended your Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX7-069", compiled);
