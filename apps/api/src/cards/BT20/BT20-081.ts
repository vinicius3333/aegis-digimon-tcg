// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-081 Fenriloogamon: Takemikazuchi:
// [Hand][Counter] <Blast DNA Digivolve ([Fenriloogamon] + [Kazuchimon])>
// [On Play][When Digivolving] 2 of your opponent's Digimon get -10000 DP for the turn.
//   Then, if a Tamer card is in this Digimon's digivolution cards, delete 1 of your
//   opponent's 10000 DP or lower Digimon.
// [When Attacking] By trashing your top security card, activate 1 of this Digimon's
//   [When Digivolving] effects.
//
// KB Q4406: can't choose the same Digimon twice for the -10000 DP effect.
// KB Q4407: Digimon with 0 DP are deleted after ALL processing finishes.

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDNADigivolve",
          "raw": "＜Blast DNA Digivolve ([Fenriloogamon] + [Kazuchimon])＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "amount": -10000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 10000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 1, "filter": {"kind": ["Tamer"]},
            "raw": "a Tamer card is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "amount": -10000,
          "duration": "forTheTurn"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 10000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 1, "filter": {"kind": ["Tamer"]},
            "raw": "a Tamer card is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ReactivateEffect",
          "fromTrigger": "WhenDigivolving",
          "count": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
              "zone": "security"
              },
              "count": 1,
              "fromTop": true
            },
            "raw": "By trashing your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-081", compiled);
