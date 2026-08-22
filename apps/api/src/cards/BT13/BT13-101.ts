// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "PawnChessmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "multicolor": true,
            "colors": [
              "Yellow",
              "Black"
            ]
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1,
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
              "abortOnDecline": true
            },
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": { "kind": "ifThisEffectActed", "raw": "you did" }
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

registerIrCard("BT13-101", compiled);
