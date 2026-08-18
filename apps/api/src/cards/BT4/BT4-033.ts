// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Fixed: 1st Trash targets opponent Digimon (not mine). Digi-Burst 2 is optional.
// "Return 1 of your opponent's Digimon (lv≤5) to hand and trash all its digivolution
// cards": SelectBind captures the target, TrashDigivolution trashes all its digivolution
// cards (amount:99 = all via Math.min), then Return bounces it to hand. Order is
// TrashDigivolution before Return because the permanent must still exist on the field
// for TrashDigivolution to act on it.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
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
                "value": 5
              }
            },
            "count": 1,
            "bindAs": "returnTarget"
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": { "isSelfRef": true, "zone": "digivolutionCards" },
              "count": 2
            },
            "raw": "＜Digi-Burst 2＞"
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
      ],
      "keywords": [
        {
          "keyword": "DigiBurst",
          "amount": 2,
          "raw": "＜Digi-Burst 2＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-033", compiled);
