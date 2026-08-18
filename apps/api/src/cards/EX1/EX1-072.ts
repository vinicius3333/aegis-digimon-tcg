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
          "kind": "RestrictPlay",
          "seat": "opponent",
          "filter": { "kind": ["Option"] },
          "mode": "play",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "RestrictPlay",
          "seat": "opponent",
          "filter": { "kind": ["Option"] },
          "mode": "play",
          "duration": "forTheTurn"
        },
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

registerIrCard("EX1-072", compiled);
