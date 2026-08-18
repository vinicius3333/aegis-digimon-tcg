// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "suspended": true,
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent",
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "colors"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Piercing",
              "raw": "＜Piercing＞"
            }
          },
          "while": {
            "kind": "opponentHasNone",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "gte",
                "relativeToSource": true
              }
            },
            "raw": "your opponent has no Digimon with equal or higher DP"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "opponentHasNone",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "gte",
                "relativeToSource": true
              }
            },
            "raw": "your opponent has no Digimon with equal or higher DP"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX8-045", compiled);
