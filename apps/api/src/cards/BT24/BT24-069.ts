// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenMoving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "TrashTopDeck",
          "controller": "opponent",
          "amount": 2,
          "condition": {
            "kind": "raw",
            "raw": "your opponent didn't trash with this effect"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "TrashTopDeck",
          "controller": "opponent",
          "amount": 2,
          "condition": {
            "kind": "raw",
            "raw": "your opponent didn't trash with this effect"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
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
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
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
            "kind": "modifyDP",
            "amount": 2000
          },
          "while": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "your opponent has 10 or more cards in their trash"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "both",
          "amount": 1
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT24-069", compiled);
