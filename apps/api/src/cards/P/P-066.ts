// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4170: You can always add the card to your hand even if no deletion occurred.
// KB Q4845: "Then, add this card to its owner's hand" always applies regardless of the
// Draw condition. Sequence: Delete → conditional Draw → unconditional AddToHandSelf.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": { "op": "lte", "value": 4000 }
            },
            "count": 1
          },
          "resultRef": "deletedByThisEffect"
        },
        {
          // Draw 1 only if no Digimon was deleted by the preceding Delete action.
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "no Digimon was deleted by this effect"
          }
        },
        {
          // Always: add this card to its owner's hand (the "Then" clause).
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-066", compiled);
