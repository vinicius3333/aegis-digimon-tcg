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
              "superlative": "lowestDP"
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "your opponent has 3 or fewer security cards"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "gte",
            "value": 4,
            "raw": "they have 4 or more"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "your opponent has 3 or fewer security cards"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "gte",
            "value": 4,
            "raw": "they have 4 or more"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "colors": [
                "Red"
              ],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-017", compiled);
