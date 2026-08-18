// @ts-nocheck
// Hand-fixed IR for P-015 — faithful De-Digivolve keyword encoding.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 1,
          "stopAtLevel": 3
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};
registerIrCard("P-015", compiled);
