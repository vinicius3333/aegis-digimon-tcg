// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Option"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "upTo": true
          },
          "to": "hand",
          "optional": false
        },
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "this effect didn't return"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOptionUsed",
          "optional": true,
          "fireCondition": {
            "kind": "triggerOptionMatchesFilter",
            "filter": {
              "kind": ["Option"],
              "nameOrTrait": [{ "tokens": ["TS"], "match": "trait" }]
            },
            "raw": "when you use a [TS] trait Option card"
          },
          "actions": [
            {
              "kind": "Suspend",
              "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true }
            },
            {
              "kind": "Restrict",
              "target": { "filter": { "controller": "opponent", "kind": ["Digimon"] }, "count": 1 },
              "restriction": "attack",
              "duration": "untilOpponentTurnEnd"
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

registerIrCard("BT25-091", compiled);
