// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
              "levelComparison": {
                "op": "gte",
                "value": 6
              }
            },
            "count": 1
          }
        },
        {
          "kind": "RawUnparsed",
          "text": "missing-primitive(unaudited): 1 of your Digimon may digivolve into [Belphemon: Sleep Mode] from your trash without paying the cost"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 Digimon card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-109", compiled);
