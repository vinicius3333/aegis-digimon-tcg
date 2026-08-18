// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT19-026 (ZeigGreymon).
// Prior fix: removed spurious colors:["Blue"] from OnDeletion PlayWithoutCost.
// New fixes:
// 1. opponentHas condition in OnPlay/WhenDigivolving Return must have countMin:2
//    (text: "if your opponent has 2 or more Digimon"). KB Q3079/Q3080 confirm the
//    count check applies at the time of the condition resolution.
// 2. OnDeletion PlayWithoutCost source zone: "from under your Tamers"
//    (the filter currently lacks a zone restriction to underTamers).
// 3. OnDeletion PlaceUnder (Save) must be mandatory after a successful play
//    (text: "Then, <Save>"), not independently optional. The play is optional;
//    if the player plays a card, Save is mandatory (abortOnDecline applies to play).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 2
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "levelComparison": { "op": "lte", "value": 4 }
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "opponentHas",
            "countMin": 2,
            "filter": {
              "controllerDefault": "opponent",
              "kind": ["Digimon"]
            },
            "raw": "your opponent has 2 or more Digimon"
          }
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
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 2
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "levelComparison": { "op": "lte", "value": 4 }
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "opponentHas",
            "countMin": 2,
            "filter": {
              "controllerDefault": "opponent",
              "kind": ["Digimon"]
            },
            "raw": "your opponent has 2 or more Digimon"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "playCostLte": 5,
              "zone": "underTamers",
              "nameOrTrait": [
                {
                  "tokens": ["Blue Flare", "Xros Heart"],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": ["underTamers"],
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "controller": "mine",
            "kind": ["Tamer"],
            "excludeToken": true
          },
          "optional": false
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-026", compiled);
