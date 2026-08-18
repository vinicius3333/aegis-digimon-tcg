// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: 1 yellow Digimon may digivolve with -3 cost, then place this card in battle area.
// [Start of Your Turn]: The <Delay> activation. If opponent has a Digimon, execute the
// two bullet-point actions: Return a yellow Digimon from trash to deck top, then optionally
// play a yellow Digimon ≤2000 DP from trash if you have no Digimon.
// The whole Delay block is optional per the rules (the condition gates whether it fires).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Yellow"]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "colors": ["Yellow"]
          },
          "from": ["hand"],
          "reduceCost": 3,
          "optional": true
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "StartOfYourTurn",
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ],
      "condition": {
        "kind": "opponentHas",
        "filter": {
          "controllerDefault": "opponent",
          "kind": ["Digimon"]
        },
        "raw": "your opponent has a Digimon"
      },
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Yellow"]
            },
            "count": 1
          },
          "to": "deckTop"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Yellow"],
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": ["trash"],
          "payCost": false,
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "kind": ["Digimon"]
            },
            "raw": "you don't have a Digimon"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Yellow"],
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": ["trash"],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("LM-029", compiled);
