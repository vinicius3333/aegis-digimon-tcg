// @ts-nocheck
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
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": ["Digimon"],
                "levels": [3]
              },
              "count": 1,
              "from": ["hand"]
            },
            "raw": "By placing 1 level 3 Digimon card from your hand under this Tamer"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "condition": {
        "kind": "youHaveNone",
        "filter": {
          "kind": ["Digimon"]
        },
        "raw": "you don't have a Digimon"
      },
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "playCostLte": 3
            },
            "count": 1
          },
          "from": ["underThisTamer"],
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
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

registerIrCard("BT20-092", compiled);
