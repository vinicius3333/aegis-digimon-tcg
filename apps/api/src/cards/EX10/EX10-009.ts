// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
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
              "superlative": "lowestDP"
            },
            "count": "all"
          }
        },
        {
          "kind": "TrashTopDeck",
          "controller": "opponent",
          "amount": 5,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
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
            "count": "all"
          }
        },
        {
          "kind": "TrashTopDeck",
          "controller": "opponent",
          "amount": 5,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red",
                "Purple"
              ],
              "dp": {
                "op": "lte",
                "value": 5000
              }
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "breeding": true,
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
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "withoutSuspending": true,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

export { compiled };

registerIrCard("EX10-009", compiled);
