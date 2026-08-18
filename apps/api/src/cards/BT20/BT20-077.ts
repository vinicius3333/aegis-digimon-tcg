// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT20-077 (HeavyMetaldramon).
// Errata (2025-02-21): "without paying the cost" added to play action — already correct
// in original IR (payCost:false).
// Fixes from audit:
// 1. Trash count is variable: "Trash cards in your hand until it has 4 left" means trash
//    (handSize - 4) cards, not exactly 1. Using trashHandToSize:4.
// 2. CostModifier: mode should be raiseCeiling on dpMaximum for the PlayWithoutCost
//    (text: "remove 2000 from this effect's DP maximum" per card trashed).
//    This is a ceiling-lowering (negative raise) on the dpThreshold of the play action.
//    Using mode:"lowerCeiling", costType:"dpThreshold", scaling per trash count.
// 3. AllTurns: adds Rush and Blocker keywords in addition to +2000 DP.
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
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": "untilHandHas",
            "untilHandSize": 4
          },
          "trackCount": "trashedThisEffect"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "dp": { "op": "lte", "value": 8000 }
            },
            "count": 1
          },
          "from": ["trash"],
          "payCost": false,
          "dpCeilingModifier": {
            "mode": "lowerCeiling",
            "amount": 2000,
            "scalingSource": "trashedThisEffect"
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
            "count": "untilHandHas",
            "untilHandSize": 4
          },
          "trackCount": "trashedThisEffect"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "dp": { "op": "lte", "value": 8000 }
            },
            "count": 1
          },
          "from": ["trash"],
          "payCost": false,
          "dpCeilingModifier": {
            "mode": "lowerCeiling",
            "amount": 2000,
            "scalingSource": "trashedThisEffect"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Dark Dragon", "Evil Dragon"],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "amount": 2000,
          "duration": "permanent"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Dark Dragon", "Evil Dragon"],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Dark Dragon", "Evil Dragon"],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": ["Dark Dragon", "Evil Dragon"],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-077", compiled);
