// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "GainMemory",
          "amount": 3,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Aqua",
                      "Sea Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by placing 1 of your other Digimon with [Aqua]/[Sea Animal] in one of its traits as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": false,
          "abortOnDecline": false
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Aquatic"
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-028", compiled);
