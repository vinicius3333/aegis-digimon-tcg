// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT25-014 (Meramon).
// Fixes:
// 1. Draw 2 condition: was raw → structured ifThisEffectDidNotDelete
//    (KB Q6259: must choose a target if one exists; Q6260: immune-to-delete counts
//    as "didn't delete").
// 2. Delete action: optional:true/abortOnDecline removed — player may activate
//    even with no valid targets (Q6258) but must choose a target when one exists
//    (Q6259); the whole [Main] effect remains activatable without targets.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
                "value": 4000
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Flame",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ],
                "zone": "hand"
              },
              "count": 1
            },
            "raw": "By trashing 1 [Flame] or [TS] trait card from your hand"
          }
        },
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 2,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
          }
        }
      ],
      "frequency": "OncePerTurn"
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
                "value": 4000
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
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "Flame",
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-014", compiled);
