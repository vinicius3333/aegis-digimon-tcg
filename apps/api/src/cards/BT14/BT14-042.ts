// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": [
                  "Green"
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom",
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By suspending this Digimon"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-042", compiled);
