// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT18-098 Dragon's Roar — Option card
// [Static] When this card is trashed from the security stack, activate its [Security] effects.
// [Static] While you have a yellow Digimon with the [Data]/[Witchelny] trait, you may ignore
//          this card's color requirements.
// [Main]   By trashing your top security card, 1 of your opponent's Digimon gets -6000 DP
//          until the end of their turn. Then, if you have 2 or fewer security cards, place
//          this card as your bottom security card.
// [Security] Delete 1 of your opponent's Digimon with 6000 DP or less.
//            If you have 0 security cards, <Recovery +1 (Deck)>.
// KB Q3050: can't process the "then" clause without trashing a security card.
// EffectTiming.OnDiscardSecurity replaces the previous dead Static→SubTrigger(whenTrashedFromSecurity)
// wrapper — it fires only from the effect-driven trash-from-security seam
// (GameEngine.fireDiscardedFromSecurity), matching "when this card is trashed from the security
// stack" without needing a byEffect/sourceFilter gate.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDiscardSecurity",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          }
        },
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
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1 (Deck)＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "eq",
            "value": 0,
            "raw": "you have 0 security cards"
          }
        }
      ]
    },
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
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Data",
                    "Witchelny"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a yellow Digimon with the [Data]/[Witchelny] trait"
          }
        }
      ]
    },
    {
      "trigger": "Main",
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
          "amount": -6000,
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "security"
              },
              "count": 1
            },
            "raw": "By trashing your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addBottom",
          "controller": "mine",
          "source": "this",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 2,
            "raw": "you have 2 or fewer security cards"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          }
        },
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
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1 (Deck)＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "eq",
            "value": 0,
            "raw": "you have 0 security cards"
          }
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT18-098", compiled);
