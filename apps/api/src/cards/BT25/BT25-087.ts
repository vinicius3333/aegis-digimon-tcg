// @ts-nocheck
// HAND-FIXED IR for BT25-087 — do not regenerate.
// AllTurns: wrapped PlaceUnder in SubTrigger(whenEffectAddsToOpponentHand) + suspend cost.
// YourTurn Replacement(wouldDigivolve): added intoFilter{trait:["DATA SQUAD"]}.
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenEffectAddsToOpponentHand",
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine"
                },
                "count": 1
              },
              "underFilter": {
                "from": "topDeck",
                "count": 2
              },
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
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "intoFilter": {
            "kind": [
              "Digimon"
            ],
            "trait": [
              "DATA SQUAD"
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the cost by 1",
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "kind": [
                      "Tamer"
                    ]
                  },
                  "count": 1
                },
                "raw": "by trashing the bottom face-down card from under any of your Tamers"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
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

registerIrCard("BT25-087", compiled);
