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
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "level",
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          }
        },
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
                "value": 3
              }
            },
            "count": 1
          }
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
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "level",
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          }
        },
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
                "value": 3
              }
            },
            "count": 1
          }
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
          "duration": "forTheTurn",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gt",
            "value": 10,
            "raw": "your opponent has more than 10 cards in their trash"
          }
        },
        {
          "kind": "TrashTopDeck",
          "controller": "both",
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

registerIrCard("EX10-049", compiled);
