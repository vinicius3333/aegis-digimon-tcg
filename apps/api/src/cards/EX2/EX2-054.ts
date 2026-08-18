// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Security]: card is played from security (not hand) — remove erroneous from:["hand"].
// [Opponent's Turn] Aura while-condition: Mother D-Reaper must have 6+ digivolution cards.
// KB Q3345-Q3346: Security effect plays as a normal Digimon once it comes into play.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Mother D-Reaper"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a [Mother D-Reaper] in play"
          }
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": -1,
              "raw": "＜Security Attack -1＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Mother D-Reaper"
                  ],
                  "match": "name"
                }
              ],
              "digivolutionCardsAtLeast": 6
            },
            "raw": "you have a [Mother D-Reaper] with 6 or more digivolution cards in play"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-054", compiled);
