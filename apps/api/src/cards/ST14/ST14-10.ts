// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedFromDeck",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "levelComparison": {
                    "op": "lte",
                    "value": 3
                  }
                },
                "count": 1
              },
              "scaling": {
                "per": 10,
                "filter": {
                  "zone": "trash",
                  "controller": "mine"
                },
                "unit": "trash",
                "levelCeilingAdd": 1
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        },
        {
          "kind": "GainMemory",
          "amount": 3,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "gte",
            "value": 20,
            "raw": "you have 20 or more cards in your trash"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST14-10", compiled);
