// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Draw",
          "controller": "opponent",
          "amount": 1
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
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
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 8,
            "raw": "your opponent has 8 or more cards in their hand"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-021", compiled);
