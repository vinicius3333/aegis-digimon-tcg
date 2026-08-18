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
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Impmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Beelzemon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand",
            "trash"
          ],
          "costOverride": 4,
          "ignoreRequirements": true,
          "optional": true,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "gte",
            "value": 20,
            "raw": "you have 20 or more cards in your trash"
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
            "raw": "by suspending this Tamer"
          },
          "abortOnDecline": true
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

registerIrCard("BT19-088", compiled);
