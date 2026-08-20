// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Partition",
          "raw": "＜Partition (Yellow/Black Lv.6 + Green/Purple Lv.6)＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "levels": [
                6
              ],
              "orFilters": [
                {
                  "colors": ["Yellow", "Black"]
                },
                {
                  "colors": ["Green", "Purple"]
                }
              ]
            },
            "count": 2,
            "upTo": true,
            "from": [
              "trash"
            ]
          },
          "condition": {
            "kind": "isDnaDigivolving"
          },
          "optional": true
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true,
          "scaling": {
            "per": 1,
            "filter": {
              "isSelfRef": true,
              "zone": "digivolutionCards",
              "levels": [
                6
              ]
            },
            "unit": "digivolutionCards"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
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
              "keyword": "SecurityAttack",
              "amount": 3,
              "raw": "＜Security Attack +3＞"
            }
          },
          "while": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 4, "filter": {"levels": [6]},
            "raw": "this Digimon has 4 or more level 6 cards in its digivolution cards"
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
            "kind": "keyword",
            "keyword": {
              "keyword": "Piercing",
              "raw": "＜Piercing＞"
            }
          },
          "while": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 4, "filter": {"levels": [6]},
            "raw": "this Digimon has 4 or more level 6 cards in its digivolution cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-062", compiled);
