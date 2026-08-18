// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for BT10-059.
// Fix vs auto-generated: the printed ＜De-Digivolve 1＞ reminder reads "(Trash 1 card
// from the top of 1 of your opponent's Digimon. Stop trashing when you would trash a
// level 3 card or the Digimon's last card.)" — a phrasing variant the compiler's
// DeDigivolve-reminder normalization (runtime effect records) doesn't recognize, so
// it fell through to the generic effect-paren unwrap and produced a spurious standalone
// Trash-1-level-3-opponent-Digimon action instead of folding the floor into the
// DeDigivolve action. The reminder is just restating the keyword's own behavior (16-12-4:
// De-Digivolve can't trash past level 3), so it belongs on the DeDigivolve action as
// `stopAtLevel: 3`, not as a second action.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "stopAtLevel": 3,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By placing this Digimon under 1 of your Digimon with [Legend-Arms] or [Xros Heart] in its traits as its bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target",
            "targetIsPermanent": true,
            "underFilter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Legend-Arms",
                    "Xros Heart"
                  ],
                  "match": "trait"
                }
              ]
            }
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Legend-Arms",
                      "Xros Heart"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-059", compiled);
