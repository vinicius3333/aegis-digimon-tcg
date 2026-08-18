import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed: inherited DNA Digivolve uses this Digimon plus one other of your
// Digimon in play. The result is restricted to a Digimon card in hand with a
// printed DNA Digivolution requirement; dnaDigivolveInto enforces the exact
// material/result legality from that requirement.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "excludeSelf": true
            },
            "count": 2,
            "includeRef": "self"
          },
          "into": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "zone": "hand",
            "hasDnaDigivolutionRequirement": true
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-020", compiled);
