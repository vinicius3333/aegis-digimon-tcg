// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST13-02 Zubamon — hand-fixed IR.
// [On Play] By placing this Digimon under 1 of your other Digimon that's black or has
//   [Legend-Arms] in its traits as its bottom digivolution card, reveal the top card of
//   your deck. If that card is a Digimon card with [Legend-Arms] in its traits and a
//   play cost of 7 or less, you may play it without paying its memory cost. Add the rest
//   to your hand.
// [Inherited] [When Attacking] If you have a Digimon that's black or has [Legend-Arms]
//   in its traits in play, delete 1 of your opponent's Digimon with 3000 DP or less.
//
// KB Q766: Player may choose not to pay the place cost (Zubamon stays in play as Digimon).
// KB Q767: Player may choose not to play the revealed Legend-Arms card (added to hand instead).
// KB Q768: If prevented from playing, add to hand.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 1,
          "add": [
            {
              // If the revealed card is a Digimon with [Legend-Arms] and play cost ≤ 7,
              // optionally play it without paying the cost.
              "filter": {
                "controllerDefault": "mine",
                "kind": ["Digimon"],
                "nameOrTrait": [
                  {
                    "tokens": ["Legend-Arms"],
                    "match": "trait"
                  }
                ],
                "playCostLte": 7
              },
              "count": 1,
              "to": "play",
              "optional": true
            },
            {
              // Add all remaining revealed cards to hand (non-matching or declined-to-play).
              "filter": {
                "controllerDefault": "mine"
              },
              "count": "all",
              "to": "hand"
            }
          ],
          "rest": "deckBottom",
          "cost": {
            "kind": "place",
            "destination": "digivolutionStack",
            "targetIsPermanent": true,
            "host": "target",
            "position": "bottom",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "By placing this Digimon under 1 of your other Digimon that's black or has [Legend-Arms] in its traits as its bottom digivolution card",
            "underFilter": {
              "or": [
                { "colors": ["Black"] },
                {
                  "nameOrTrait": [
                    {
                      "tokens": ["Legend-Arms"],
                      "match": "trait"
                    }
                  ]
                }
              ],
              "controller": "mine",
              "excludeSelf": true,
              "kind": ["Digimon"]
            }
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": {
                "op": "lte",
                "value": 3000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "or": [
                { "colors": ["Black"] },
                {
                  "nameOrTrait": [
                    {
                      "tokens": ["Legend-Arms"],
                      "match": "trait"
                    }
                  ]
                }
              ],
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": ["Digimon"]
            },
            "raw": "you have a Digimon that's black or has [Legend-Arms] in its traits in play"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST13-02", compiled);
