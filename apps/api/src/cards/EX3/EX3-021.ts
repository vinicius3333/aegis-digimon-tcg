// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-021. "Any 2" means the effect controller chooses two
// individual cards anywhere in one stack (Q3393), rather than trashing the top two.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "hasAny"
            },
            "count": 1
          },
          "amount": 2,
          "choose": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "digivolutionCards": "none",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "attackOrBlock",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX3-021", compiled);
