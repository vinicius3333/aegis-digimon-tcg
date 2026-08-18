// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": "all"
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 6,
            "raw": "you have 6 or fewer cards in your hand"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 6,
            "raw": "you have 6 or fewer cards in your hand"
          }
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your other Digimon"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "EndOfOpponentsTurn",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true,
            "topCardOnly": true
          },
          "condition": {
            "kind": "raw",
            "raw": "this Digimon is [Belphemon: Sleep Mode]"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-091", compiled);
