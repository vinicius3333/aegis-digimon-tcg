// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Creepymon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "opponent"
                },
                "count": 1
              },
              "condition": {
                "kind": "zoneCount",
                "seat": "opponent",
                "zone": "trash",
                "op": "gte",
                "value": 10,
                "raw": "your opponent has 10 or more cards in their trash"
              },
              "cost": {
                "kind": "raw",
                "raw": "by digivolving it into this card without paying the cost"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "isFromTrash": true
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestLevel"
            },
            "count": "all"
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Evil",
                    "Fallen Angel"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 4,
            "upTo": true
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "playcost",
          "amount": 4,
          "scaling": {
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "opponent"
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Creepymon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-078", compiled);
