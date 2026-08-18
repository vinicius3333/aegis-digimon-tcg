// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for P-243 (Digiseabass).
// [Start of Your Turn]: GainKeyword(Delay) arms the source on a given turn (gated on
//   opponent having a Digimon); PlayWithoutCost carries requiresDelayArmed:true so it
//   only fires while that Delay grant is active and consumes it on resolution.
// [Start of Your Turn] PlayWithoutCost sub-action: added playCost ≤ 3 restriction
//   (text: "play 1 play cost of 3 or lower [DM] trait card").
// [Security] PlayWithoutCost: same playCost ≤ 3 restriction added.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
          "condition": {
            "kind": "youHave",
            "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["DM"], "match": "trait" }] },
            "raw": "you have a card w/[DM] trait"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 2,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          }
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Delay",
            "raw": "＜Delay＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
        },
        {
          "kind": "PlayWithoutCost",
          "requiresDelayArmed": true,
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 3
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "DM"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 [DM] trait Digimon card from trash to the top of your deck"
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 3
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-243", compiled);
