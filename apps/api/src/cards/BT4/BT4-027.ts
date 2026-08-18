// @ts-nocheck
// HAND-FIXED IR for BT4-027 (KendoGarurumon) — do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1,
            "bindAs": "returnTarget"
          }
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "returnTarget"
          },
          "amount": 99,
          "raw": "Trash all of the digivolution cards of that Digimon."
        },
        {
          "kind": "Return",
          "target": {
            "filter": {},
            "count": 1,
            "fromSelectionRef": "returnTarget"
          },
          "to": "hand"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "cost": 3,
      "isAlternate": true,
      "baseIsTamer": true,
      "baseColors": [
        "Blue"
      ]
    }
  ]
};

registerIrCard("BT4-027", compiled);
