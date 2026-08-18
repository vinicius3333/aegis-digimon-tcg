// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-187 Mastemon
// [When Digivolving] <Recovery +1 (Deck)>. Then, if DNA digivolving, by placing
//   1 other Digimon or Tamer (yours OR opponent's) as the top or bottom security card,
//   trash your opponent's top security card.
// [When Digivolving][When Attacking] [Once Per Turn] By trashing your top security card,
//   play 1 purple or yellow Digimon ≤6000 DP from hand or trash without cost.
//
// KB Q4631: yes, you can place either your own or your opponent's Digimon/Tamer.
// KB Q4632: <Recovery +1 (Deck)> fires even when NOT DNA digivolving.
// The [Once Per Turn] is shared across both triggers ([When Digivolving] and [When Attacking])
// — one use per turn total. sharedUseKey links the two CardEffect entries to the same quota.
//
// CAPABILITY GAP: PlaceCost destination:"security" supports position:"top"|"bottom" but not
// the player's choice of top-or-bottom. See LANE_C.md: PlaceCostTopOrBottom.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [],
      "keywords": [
        {
          "keyword": "Recovery",
          "amount": 1,
          "raw": "＜Recovery +1 (Deck)＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "any",
                "excludeSelf": true,
                "kind": [
                  "Digimon",
                  "Tamer"
                ]
              },
              "count": 1
            },
            "destination": "security",
            "raw": "by placing 1 other Digimon or Tamer as the top or bottom security card"
          },
          "optional": true,
          "abortOnDecline": true,
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                "Yellow",
                "Purple"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "By trashing your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "trashSecurityPlayDigimon"
    },
    {
      "trigger": "WhenAttacking",
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
                "Yellow",
                "Purple"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security",
                "position": "top"
              },
              "count": 1
            },
            "raw": "By trashing your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "trashSecurityPlayDigimon"
    }
  ],
  "coverage": "partial",
  "residual": [
    "PlaceCostTopOrBottom: place cost position 'top or bottom' (player chooses) not yet in IR — encoded as destination:security without position; see LANE_C.md"
  ]
};

registerIrCard("P-187", compiled);
