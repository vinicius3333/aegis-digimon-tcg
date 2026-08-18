// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-209 Titamon
// effectText:
//   [Digivolve] Lv.5 w/[Demon]/[TS] trait: Cost 3
//   <Alliance>
//   [On Play][When Digivolving] By trash 1 card in your hand, suspend 1 of your opponent's
//     Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.
//   [All Turns][Once Per Turn] When your hand is trashed from, you may play 1 level 4 or lower
//     [Demon] card from your trash without paying the cost.
//
// KB Q5401: if the "by" condition (trash 1 card from hand) is not performed, the rest does not activate.
// Encoding: Trash is the cost (optional to engage the whole effect; abortOnDecline prevents the
//   rest of the sequence). Suspend and Restrict are mandatory once the cost is paid.
// [All Turns] whenHandTrashed fires when cards are trashed from hand — controller:"mine" scoped.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Alliance",
          "raw": "＜Alliance＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          // "By trash 1 card in your hand" — optional cost that gates the whole effect.
          // KB Q5401: must perform the trash; if not, Suspend and Restrict do not activate.
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "abortOnDecline": true,
          "raw": "By trashing 1 card in your hand"
        },
        {
          // Mandatory suspend (executes only if trash cost was paid).
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        },
        {
          // "Then" — mandatory restrict once suspend resolves.
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          },
          "optional": true,
          "abortOnDecline": true,
          "raw": "By trashing 1 card in your hand"
        },
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      // [All Turns][Once Per Turn] When your hand is trashed from (cards from hand are trashed),
      // you may play 1 level 4 or lower [Demon] card from trash without paying the cost.
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenHandTrashed",
          "sourceFilter": {
            "controller": "mine"
          },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "levelComparison": {
                    "op": "lte",
                    "value": 4
                  },
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Demon"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "trash"
              ],
              "payCost": false,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "Demon",
        "TS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-209", compiled);
