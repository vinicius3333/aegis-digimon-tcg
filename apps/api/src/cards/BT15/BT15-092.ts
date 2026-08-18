import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT15-092 Revelation of Light — Option card
// [Static]   When an effect trashes this card from the security stack, activate
//             this card's [Security] effect.
//             (KB Q6239: only when directly trashed from security, not revealed/searched.)
// [Main]     Search your security stack. You may play 1 yellow level 4 or lower Digimon
//             card among it without paying the cost. Then, shuffle your security stack.
//             If you have a Tamer with [Kari Kamiya] in its name, place this card on
//             top of your security stack.
// [Security] All of your opponent's Digimon get -5000 DP until the end of your turn.
//             All of your opponent's Security Digimon get -5000 DP until the end of your turn.
//
// NOTE (plan 08-06): the missing-primitive flag tagged BT15-092 with `use-option-without-cost`,
// but neither the printed text nor documented behavior (documented behavior) contains a "use an Option without
// paying the cost" clause — the [Main] clause PLAYS a yellow Lv.4 Digimon from security
// The flag conflated "play a Digimon without cost" with the use-option gap. This card is faithful
// and complete; 08-06 records it as a use-option SIGN-OFF (no phantom clause to author).
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
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
                "count": "all"
              },
              "amount": -5000,
              "duration": "untilYourTurnEnd"
            },
            {
              "kind": "ModifySecurityDP",
              "controller": "opponent",
              "amount": -5000,
              "duration": "untilYourTurnEnd"
            }
          ],
          "raw": "When an effect trashes this card from the security stack, activate this card's [Security] effects"
        }
      ]
    },
    {
      "trigger": "Main",
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
                "Yellow"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "from": [
            "security"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "shuffle",
          "controller": "mine"
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
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Kari Kamiya"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Tamer with [Kari Kamiya] in its name"
          }
        }
      ]
    },
    {
      "trigger": "Security",
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
            "count": "all"
          },
          "amount": -5000,
          "duration": "untilYourTurnEnd"
        },
        {
          "kind": "ModifySecurityDP",
          "controller": "opponent",
          "amount": -5000,
          "duration": "untilYourTurnEnd"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT15-092", compiled);
