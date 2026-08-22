import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red",
                "Black"
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
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Red", "Black"],
              "nameOrTrait": [{ "tokens": ["TS"], "match": "trait" }]
            },
            "count": "all"
          },
          "keyword": { "keyword": "Link", "amount": 1, "raw": "＜Link +1＞" },
          "duration": "permanent",
          "condition": {
            "kind": "youHave",
            "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["Vulcanusmon"], "match": "name" }] },
            "raw": "you have [Vulcanusmon]"
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
          "toTop": false
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "toTop": false,
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
                "Black"
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
          "optional": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 3,
          "raw": "play 1 black or red [TS] trait Digimon card from your hand with the play cost reduced by 3",
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
                "Black"
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

registerIrCard("BT25-102", compiled);
