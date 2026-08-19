// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-095 Paradise Colosseum (Option card)
// While you have no face-up security cards, you can ignore this card's color requirements.
// [Security] [All Turns] All of your red or green [TS] trait Digimon get +2000 DP.
//   While you have [Marsmon] or [Callismon], they also gain ＜Rush＞.
// [Main] Add your bottom security card to the hand and place this card face up as the
//   bottom security card. Then, you may play 1 red or green [TS] trait Digimon card
//   from your hand with the cost reduced by 3.
//
// KB Q6451: When security=0, the "add to hand" is skipped; you only place this card.
//   The securityToHand primitive is a no-op when the stack is empty, so no condition needed.
// KB Q6452-6455: Face-up security cards stay revealed; security checks still work normally.
//
// The [Main] play action is "with the cost reduced by 3" (not free): PlayWithoutCost
// with payCost:true + reduceCostBy:3. The prior IR had a separate Replacement action
// for the cost reduction, which is wrong (it was a standalone action not tied to the play).
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
              "controllerDefault": "mine"
            },
            "raw": "you have no face-up security cards"
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
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red",
                "Green"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
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
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red",
                "Green"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
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
              "keyword": "Rush",
              "raw": "＜Rush＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marsmon",
                    "Callismon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have [Marsmon] or [Callismon]"
          }
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": false,
          "position": "bottom"
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "toTop": false,
          "position": "bottom",
          "faceUp": true
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
                "Red",
                "Green"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "reduceCostBy": 3,
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
                "Red",
                "Green"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
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

registerIrCard("BT25-095", compiled);
