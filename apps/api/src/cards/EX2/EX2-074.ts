// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX2-074 Beelzemon: Blast Mode
// Text: "When this card is trashed from your deck, delete 1 of your opponent's level 4 or lower
//   Digimon."
// Text: "[When Digivolving] Delete all of your opponent's Digimon with the highest level."
// Text: "[Your Turn] For every 10 cards in your trash, this Digimon gains <Security Attack +1>."
// KB Q3368: "when trashed from the deck" ONLY fires when directly trashed from the deck,
//   NOT when revealed or searched.
// Fixes:
//   - First effect: Static → AllTurns SubTrigger "whenTrashedFromDeck" (mirrors EX2-044 pattern)
//   - Added level 4 or lower filter (levelComparison lte 4) on delete target
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
              "kind": "Delete",
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
              }
            }
          ]
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
              "superlative": "highestLevel"
            },
            "count": "all"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
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
          "duration": "permanent",
          "scaling": {
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "trash"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-074", compiled);
