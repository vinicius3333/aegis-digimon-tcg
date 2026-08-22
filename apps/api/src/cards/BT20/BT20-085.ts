// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT20-085: the [End of Your Turn] compile glued the [Vortex
// Warriors] trait (which belongs to the +2000 DP leg on YOUR Digimon) onto the
// opponent-suspend target and dropped the DP leg entirely. The sequencing guards
// below also preserve both "by" costs before resolving their following clauses.
// "By suspending this Tamer, suspend 1 of your opponent's Digimon and, until the
// end of their turn, 1 of your Digimon with the [Vortex Warriors] trait gets
// +2000 DP."
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Shoto Kazama"
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
          "cost": {
            "kind": "return",
            "position": "bottom",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By returning this Tamer to the bottom of the deck"
          },
          "optional": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "allOf",
            "conditions": [
              { "kind": "ifThisEffectActed" },
              { "kind": "youHaveNone", "filter": { "kind": ["Digimon"] } }
            ],
            "raw": "you don't have a Digimon"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Suspend",
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
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By suspending this Tamer"
          },
          "abortOnDecline": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Vortex Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "amount": 2000,
          "duration": "untilOpponentTurnEnd"
          ,"condition": { "kind": "ifThisEffectActed" }
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

registerIrCard("BT20-085", compiled);
