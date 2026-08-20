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
          "kind": "SubTrigger",
          "event": "whenTrashedFromHand",
          "raw": "When one of your effects trashes this card in your hand, draw 1 card.",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Draw",
              "amount": 1,
              "controller": "mine"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
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

registerIrCard("BT14-100", compiled);
export { compiled };
