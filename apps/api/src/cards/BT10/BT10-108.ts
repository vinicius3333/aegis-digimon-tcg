// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedFromDeck",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "AddToHandSelf"
            }
          ],
          "raw": "When this card is trashed from your deck, return it to your hand"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
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
                "value": 7
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "there are 10 or more cards in your trash"
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
                "value": 6
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "lte",
            "value": 9,
            "raw": "there are fewer than 10 cards in your trash"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-108", compiled);
