// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "selfDigivolutionCountAtLeast",
            "value": 4,
            "raw": "this Digimon has 4 or more digivolution cards"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST1-01", compiled);
