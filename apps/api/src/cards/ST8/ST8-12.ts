// @ts-nocheck
// Hand-authored override for ST8-12 (V-Wing Blade, Option).
// Fix: "Trash all of the digivolution cards of that Digimon" means the digivolution
// stack of the RETURNED opponent Digimon, not the player's own Digimon.
// Order: SelectBind captures the target, TrashDigivolution trashes its stack (amount:99 = all),
// then Return bounces it. TrashDigivolution must precede Return because the permanent
// must still be on the field for TrashDigivolution to act on it.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 6
              }
            },
            "count": 1,
            "bindAs": "returnTarget"
          }
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "fromSelectionRef": "returnTarget",
            "filter": {},
            "count": 1
          },
          "amount": 99
        },
        {
          "kind": "Return",
          "target": {
            "fromSelectionRef": "returnTarget",
            "filter": {},
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST8-12", compiled);
