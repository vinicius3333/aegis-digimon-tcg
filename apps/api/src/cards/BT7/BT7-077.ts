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
          "event": "whenTrashedFromHand",
          "sourceFilter": {
            "isSelfRef": true
          },
          "bySourceController": "mine",
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ],
          "raw": "When you trash this card in your hand using one of your effects, gain 1 memory."
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                "value": 4
              }
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "by trashing 1 card in your hand"
          },
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT7-077", compiled);
