// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "triggerEnteredByEffect",
            "raw": "played by an effect"
          }
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-022", compiled);
