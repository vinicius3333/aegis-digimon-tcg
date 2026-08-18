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
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 1,
          "raw": "Reduce the memory cost of this card in your hand by 1",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "battleArea",
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Yellow"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -12000,
          "duration": "forTheTurn"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-099", compiled);
