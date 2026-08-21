// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play] / [When Digivolving]: Trash 2 cards from your hand. Then,
// 1 of your Digimon gets +4000 DP for the turn and gains <Raid> and <Piercing>.
export const compiled: CompiledCard = {
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
            "count": 2
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "loudmonTarget"
          },
          "amount": 4000,
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "loudmonTarget"
          },
          "keyword": {
            "keyword": "Raid",
            "raw": "＜Raid＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "loudmonTarget"
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn"
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
            "count": 2
          }
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "loudmonTarget"
          },
          "amount": 4000,
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "loudmonTarget"
          },
          "keyword": {
            "keyword": "Raid",
            "raw": "＜Raid＞"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "loudmonTarget"
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn"
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
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Dragon",
                    "Evil Dragon"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 4,
            "raw": "you have 4 or fewer cards in your hand"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "Dark Dragon",
        "Evil Dragon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-075", compiled);
