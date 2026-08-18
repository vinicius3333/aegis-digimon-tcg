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
            "kind": "opponentHas",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 6
              }
            },
            "raw": "your opponent has a level 6 or higher Digimon in play"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Omnimon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "effect": { "kind": "keyword", "keyword": { "keyword": "SecurityAttack", "amount": 1, "raw": "＜Security Attack +1＞" } },
          "while": { "kind": "true" }
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

registerIrCard("BT5-093", compiled);
