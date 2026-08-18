// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer cards in their hand"
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
          "chooser": "opponent",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 7,
            "raw": "your opponent has 7 or more cards in their hand"
          }
        }
      ]
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
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer cards in their hand"
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
          "chooser": "opponent",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 7,
            "raw": "your opponent has 7 or more cards in their hand"
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
            "kind": "modifyDP",
            "amount": 1000
          },
          "while": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "lte",
            "value": 6,
            "raw": "your opponent has 6 or fewer cards in their hand"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-049", compiled);
