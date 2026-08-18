// @ts-nocheck
// HAND-FIXED IR for BT19-082 — do not regenerate.
// YourTurn SubTrigger PlaceUnder: added from:["hand"], underFilter:{mine Digimon},
// position:bottom (places Aqua/Sea Animal Lv.≤5 from hand under a Digimon).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "SetMemory",
          "value": 3,
          "condition": {
            "kind": "memoryAtMost",
            "value": 2
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Aqua", "Sea Animal"],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "levelComparison": {
                    "op": "lte",
                    "value": 5
                  },
                  "nameOrTrait": [
                    {
                      "tokens": ["Aqua", "Sea Animal"],
                      "match": "trait"
                    }
                  ]
                },
                "from": ["hand"],
                "count": 1
              },
              "underFilter": {
                "controller": "mine",
                "kind": ["Digimon"]
              },
              "position": "bottom",
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-082", compiled);
