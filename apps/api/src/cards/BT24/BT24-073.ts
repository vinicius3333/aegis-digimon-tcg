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
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "both",
          "amount": 3,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "lte",
            "value": 10,
            "raw": "your opponent has 10 or fewer cards in their trash"
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
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
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "both",
          "amount": 3,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "lte",
            "value": 10,
            "raw": "your opponent has 10 or fewer cards in their trash"
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
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
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
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
          "duration": "forTheTurn"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "lte",
            "value": 10,
            "raw": "your opponent has 10 or fewer cards in their trash"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "lte",
            "value": 10,
            "raw": "your opponent has 10 or fewer cards in their trash"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT24-073", compiled);
