// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
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
            "count": "all"
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "isSelfRef": true,
                "zone": "digivolutionCards"
              },
              "count": 4
            },
            "raw": "＜Digi-Burst 4＞"
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "to": "deckBottom"
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": 99
        }
      ],
      "keywords": [
        {
          "keyword": "DigiBurst",
          "amount": 4,
          "raw": "＜Digi-Burst 4＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-062", compiled);
