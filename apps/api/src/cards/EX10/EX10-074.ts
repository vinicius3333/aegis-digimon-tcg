// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5189: multiple simultaneous effects — player chooses order.
// KB Q5190: must return exactly 2 non-Digi-Egg cards (can't do just 1).
// KB Q5191: can use <Blast Digivolve> during counter timing even in opponent's turn.
// Digivolve: alternate path requires 20+ cards in trash (whileCondition) — see LANE_D.md.
// [On Play/WhenDigivolving] cost for DeDigivolve: "returning 2 non-Digi-Egg cards from
//   trash to the top of the deck" — filter excludes DigiEgg kind; to: "deckTop".
// "For every 10 cards in your trash, add 3 to the play cost maximum" — the ceiling on
//   which Digimon the Delete can target scales with trash count (playCostCeiling on Delete).
//   See LANE_D.md: DeletePlayCostCeiling.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 6
            },
            "count": 1
          },
          "playCostCeiling": {
            "base": 6,
            "raise": 3,
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "cards",
            "raw": "For every 10 cards in your trash, add 3 to the play cost maximum"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 6
            },
            "count": 1
          },
          "playCostCeiling": {
            "base": 6,
            "raise": 3,
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "cards",
            "raw": "For every 10 cards in your trash, add 3 to the play cost maximum"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 6
            },
            "count": 1
          },
          "playCostCeiling": {
            "base": 6,
            "raise": 3,
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "cards",
            "raw": "For every 10 cards in your trash, add 3 to the play cost maximum"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "you have 10 or more cards in your trash"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "excludeKind": [
                  "DigiEgg"
                ]
              },
              "count": 2
            },
            "to": "deckTop",
            "raw": "by returning 2 non-Digi-Egg cards from your trash to the top of the deck"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 2,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "you have 10 or more cards in your trash"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "excludeKind": [
                  "DigiEgg"
                ]
              },
              "count": 2
            },
            "to": "deckTop",
            "raw": "by returning 2 non-Digi-Egg cards from your trash to the top of the deck"
          },
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": [
        "Impmon"
      ],
      "cost": 4,
      "isAlternate": true,
      "whileCondition": {
        "kind": "zoneCount",
        "seat": "mine",
        "zone": "trash",
        "op": "gte",
        "value": 20,
        "raw": "while you have 20 or more cards in trash"
      }
    }
  ]
};
registerIrCard("EX10-074", compiled);
