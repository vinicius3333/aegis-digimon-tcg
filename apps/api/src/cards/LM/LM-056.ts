// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// LM-056 Image Training
// [Static] While you don't have [Image Training] in the battle area, you can ignore this
//   card's color requirements. (youHaveNone filter is correct for "don't have")
// [Main] Reveal the top 2 cards of your deck. Add 1 blue or purple card among them to
//   the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.
// [Main] <Delay> 1 of your Digimon may digivolve into a blue or purple Digimon card in
//   your hand for its digivolution cost. When it would digivolve by this effect, reduce
//   the cost by 2.
// [Security] (same as [Main] reveal effect + place in battle area)
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
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
                  "tokens": [
                    "Image Training"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have [Image Training] in the battle area"
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
                "colors": [
                  "Blue",
                  "Purple"
                ]
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
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Blue",
              "Purple"
            ]
          },
          "from": [
            "hand"
          ],
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
                "colors": [
                  "Blue",
                  "Purple"
                ]
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

registerIrCard("LM-056", compiled);
