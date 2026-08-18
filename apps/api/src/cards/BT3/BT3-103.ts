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
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "digivolve",
          "amount": 5,
          "target": {
            "filter": {
              "zone": "battleArea",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ]
            },
            "count": 1
          },
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
            "raw": "you may suspend 1 of your Digimon to reduce the memory cost of the digivolution by 5"
          },
          "optional": true,
          "once": true,
          "duration": "forTheTurn",
          "restriction": "next time one of your green Digimon digivolves this turn"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT3-103", compiled);
