// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
                "value": 4
              }
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
          "amount": 99
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
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "gte",
            "value": 8,
            "raw": "you have 8 or more cards in your hand"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST8-10", compiled);
