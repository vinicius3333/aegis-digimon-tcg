// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Keywords are permanent Static (no [Main] label in printed text).
// [All Turns] "when this Digimon would leave the battle area by effects" — mode:prevent
// with cost of returning 3 [Dex]/[DeathX] cards from trash to deck bottom.
// [End of All Turns] [Once Per Turn] "Delete all Digimon with the lowest level" —
// targets ALL Digimon (both players), superlative lowestLevel.
// KB Q4408: must return exactly 3 cards (partial payment fails the condition).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    },
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "mode": "prevent",
          "leaveCause": "byEffect",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Dex", "DeathX"],
                    "match": "name"
                  }
                ]
              },
              "count": 3
            },
            "position": "bottom",
            "raw": "by returning 3 cards with [Dex]/[DeathX] in their names from your trash to the bottom of the deck, it doesn't leave"
          },
          "raw": "when this Digimon would leave the battle area by effects, by returning 3 cards with [Dex]/[DeathX] in their names from your trash to the bottom of the deck, it doesn't leave"
        }
      ]
    },
    {
      "trigger": "EndOfAllTurns",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "kind": ["Digimon"],
              "superlative": "lowestLevel"
            },
            "count": "all"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-082", compiled);
