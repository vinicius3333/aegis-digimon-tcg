// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Static: while you don't have another [Shadow Training] in the battle area,
// ignore this card's color requirements (WaiveColorRequirement).
// Main (Delay): 1 Digimon may digivolve into a green/purple Digimon from hand
// for its digivolution cost, reduced by 2 (payCost:true + effectScopedReduction).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Shadow Training"],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have [Shadow Training] in the battle area"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 2,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": ["Green", "Purple"]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ],
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "colors": ["Green", "Purple"],
            "zone": "hand"
          },
          "from": ["hand"],
          "payCost": true,
          "reduceCost": 2,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 2,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": ["Green", "Purple"]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("LM-060", compiled);
