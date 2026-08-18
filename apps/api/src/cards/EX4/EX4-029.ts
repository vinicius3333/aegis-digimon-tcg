// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// effectText: Digivolve 3 from Lv.4 2-color w/green
// Digivolution parenthetical (inherited WhenAttacking):
//   by suspending 1 of your other Digimon, this Digimon adds the suspended Digimon's DP
//   and gains <Security Attack +1> for the attack.
// [End of Attack] (non-inherited): If you have 3 or fewer security cards, place the top
//   card of your deck on top of your security stack.
// inheritedEffectText: [End of Attack][Once Per Turn] If you have another suspended Digimon
//   in play, 1 of your opponent's Digimon gets -2000 DP for the turn.
//
// LANE_H CAPABILITY: AddDPFromSuspendedCost (CAP-LANE-H-01) — see LANE_H.md
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "AddDPFromSuspendedCost",
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "battleArea",
                "kind": [
                  "Digimon"
                ],
                "excludeSelf": true
              },
              "count": 1
            },
            "raw": "by suspending 1 of your other Digimon"
          },
          "dpSource": {
            "kind": "suspendedTarget"
          },
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "duration": "forThisAttack",
          "alsoGainKeywords": [
            {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          ]
        }
      ],
      "isInherited": true
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "placeFromDeck",
          "controller": "mine",
          "amount": 1,
          "toTop": true,
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "security",
              "controllerDefault": "mine"
            },
            "count": 3,
            "comparison": "lte",
            "raw": "you have 3 or fewer security cards"
          }
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -2000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "excludeSelf": true,
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "raw": "you have another suspended Digimon in play"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "multicolor": true,
      "colors": [
        "Green"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX4-029", compiled);
