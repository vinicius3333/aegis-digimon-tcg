// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "raw": "your opponent doesn't have a level 4 or lower Digimon in play"
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
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Purple"
            ]
          },
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "optional": true,
              "abortOnDecline": true
            },
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
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

registerIrCard("BT6-091", compiled);
