// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// LM-028 Blue Scramble
// [Main] 1 of your blue Digimon may digivolve into a blue Digimon card in the hand with
//   the digivolution cost reduced by 3. Then, place this card in the battle area.
// [Start of Your Turn] If your opponent has a Digimon, <Delay>
//   - Return 1 blue Digimon card from your trash to the top of the deck.
//   - Then, if you don't have a Digimon, you may play 1 blue Digimon card with 2000 DP
//     or less from your trash without paying the cost.
// [Security] You may play 1 blue Digimon card with 2000 DP or less from your trash
//   without paying the cost. Then, add this card to the hand.
//
// Q4041: You CAN activate the <Delay> effect even if you have no blue Digimon in trash.
// Q4042: You MUST perform the Return step whenever possible; you cannot skip it to play.
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
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
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
              "Blue"
            ]
          },
          "from": [
            "hand"
          ],
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
      "condition": {
        "kind": "opponentHas",
        "filter": {
          "controllerDefault": "opponent",
          "kind": [
            "Digimon"
          ]
        },
        "raw": "your opponent has a Digimon"
      },
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ],
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ]
            },
            "count": 1
          },
          "to": "deckTop",
          "from": ["trash"],
          "mandatory": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
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
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "dp": {
                "op": "lte",
                "value": 2000
              }
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
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

registerIrCard("LM-028", compiled);
