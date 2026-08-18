// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-109 Imperialdramon: Dragon Mode (ACE)
// [Hand] [Counter] <Blast Digivolve>
// [On Play] [When Digivolving] Suspend 1 Digimon, then unsuspend 1 Digimon.
// [All Turns] [Once Per Turn] When this Digimon becomes suspended, you may play a Tamer
//   card or a Digimon card with 4000 DP or less from your hand without paying the cost.
//
// Q4213: You CAN target this Digimon itself with the suspend+unsuspend (suspend then
//   immediately unsuspend self).
// Q4214: If you suspend then unsuspend this Digimon via the OnPlay/WhenDigivolving
//   effect, the [All Turns] SubTrigger fires (it sees the suspension event).
// The [Once Per Turn] frequency is correctly on the AllTurns CardEffect (not the
//   SubTrigger action) — the CardEffect.frequency gate limits the watcher to firing once.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "frequency": "OncePerTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "raw": "When this Digimon becomes suspended",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon",
                    "Tamer"
                  ],
                  "dp": {
                    "op": "lte",
                    "value": 4000
                  }
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
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-109", compiled);
