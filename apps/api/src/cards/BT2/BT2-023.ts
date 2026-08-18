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
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "play",
          "amount": 1,
          "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
          "handResident": true,
          "duration": "permanent",
          "scaling": {
            "per": 1,
            "filter": {
              "digivolutionCards": "none",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-023", compiled);
