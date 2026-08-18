// Hand-fixed behavioral IR. The generator preserves files without its AUTO-GENERATED header.
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
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "suspended": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-047", compiled);
