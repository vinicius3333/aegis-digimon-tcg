// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT24-018 (Styracomon).
// Text:
//   ＜Progress＞ ＜Piercing＞ ＜Blocker＞ ＜Armor Purge＞
//   [When Digivolving] You may trash any 1 of your opponent's security cards. Then, this
//   Digimon may unsuspend.
//   [All Turns] [Once Per Turn] When your opponent's security stack is removed from, you
//   may delete 1 of their Digimon.
//   [All Turns] [Once Per Turn] When any of your [Reptile] or [Dragonkin] trait Digimon
//   would leave the battle area, by deleting 1 of your opponent's lowest DP Digimon, they
//   don't leave.
// KB Q5596: choose 1 card in opponent's security stack and trash it.
// KB Q5597: [Security] effects take priority; others activate in turn-player order.
// KB Q5598: affects ALL Reptile/Dragonkin at once (no need to choose).
// KB Q5599: if deletion fails, Digimon still leaves.
// KB Q5600: Armor Purge and 2nd All Turns trigger simultaneously when this would be deleted.
// Fixes vs AUTO-GENERATED:
//   - WhenDigivolving Trash: target filter now has zone:"security" and controller:"opponent"
//   - WhenDigivolving Trash: does not abort the following optional Unsuspend when declined.
//   - Replacement sourceFilter: changed from isSelfRef to Reptile/Dragonkin trait filter
//     (protects ALL such Digimon, per KB Q5598)
//   - Replacement cost: changed from deleteOwn (deletes own cards) to raw cost describing
//     "delete 1 of your opponent's lowest DP Digimon" — NEW CAPABILITY: deleteOpponent cost.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Progress",
          "raw": "＜Progress＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
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
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
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
              "controller": "opponent",
              "zone": "security"
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controllerDefault": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Reptile", "Dragonkin"],
                "match": "trait"
              }
            ]
          },
          "actions": [],
          "cost": {
            "kind": "raw",
            "target": {
              "filter": {
                "controller": "opponent",
                "kind": ["Digimon"],
                "superlative": "lowestDP"
              },
              "count": 1
            },
            "raw": "by deleting 1 of your opponent's lowest DP Digimon, they don't leave"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "Replacement cost 'deleteOpponent' (delete opponent's Digimon as cost) not yet a named cost kind — using raw cost. Spec in LANE_F.md."
  ],
  "digivolutionRequirement": [
    {
      "names": ["Owen Dreadnought", "Lamiamon"],
      "cost": 6,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-018", compiled);
