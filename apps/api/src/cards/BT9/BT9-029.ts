// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "zone": "battleArea",
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              { "tokens": ["Justimon", "Raidenmon"], "match": "name" }
            ]
          },
          "cost": {
            "kind": "payMemory",
            "memory": 1
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Justimon",
                    "Raidenmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Digimon with [Justimon] or [Raidenmon] in its name in play"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "hand",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "You may trash 1 Digimon card with [Machine] or [Cyborg] in its traits from your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "hand"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-029", compiled);
