// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST20-15 Island of Adventure
// [Static] While you have no face-up [Island of Adventure] security cards,
//   you can ignore this card's color requirements.
// [Security] [All Turns] All of your level 3 or higher Digimon get +2000 DP.
// [Main] Add your top security card to the hand. Then, place this card face up as the top security card.
// [Security] You may play 1 Tamer card from your hand without paying the cost.
// Q4697: can activate [Main] with 0 security cards; can't add top security but still places self as security
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
              "controllerDefault": "mine",
              "zone": "security",
              "faceUp": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Island of Adventure"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have no face-up [Island of Adventure] security cards"
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
              "levelComparison": {
                "op": "gte",
                "value": 3
              }
            },
            "count": "all"
          },
          "amount": 2000,
          "duration": "permanent"
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
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "toTop": true,
          "faceUp": true
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
                "Tamer"
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
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

registerIrCard("ST20-15", compiled);
