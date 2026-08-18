// @ts-nocheck
// HAND-FIXED IR — downstream branches inspect the color of the card actually trashed.
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
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          },
          "bindResultAs": "discardedCard",
          "optional": true
        },
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
            "kind": "bindingContains",
            "ref": "discardedCard",
            "filter": { "colors": ["Purple"] }
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "bindingContains",
            "ref": "discardedCard",
            "filter": { "colors": ["Yellow"] }
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
          },
          "bindResultAs": "discardedCard",
          "optional": true
        },
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
            "kind": "bindingContains",
            "ref": "discardedCard",
            "filter": { "colors": ["Purple"] }
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "bindingContains",
            "ref": "discardedCard",
            "filter": { "colors": ["Yellow"] }
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "selfColorCount",
            "op": "gte",
            "value": 2
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-076", compiled);
