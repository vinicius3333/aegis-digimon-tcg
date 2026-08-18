// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT8-015 Silphymon
// [When Digivolving]: "1 of your opponent's Digimon gets -5000 DP for the turn.
//   Then, when DNA digivolving, delete 1 of your opponent's Digimon with 5000 DP or less."
// Fix 1: second action is conditional on DNA digivolving.
// Fix 2: DP threshold was encoded as 1 instead of 5000.
const compiled: CompiledCard = {
  "dnaDigivolveRequirement": [
    {
      "cost": 0,
      "materials": [
        { "color": "Red", "level": 4 },
        { "color": "Yellow", "level": 4 }
      ]
    }
  ],
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -5000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          },
          "condition": { "kind": "isDnaDigivolving" }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-015", compiled);
