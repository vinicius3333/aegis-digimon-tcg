// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-075 Eosmon (Ultimate)
// [Digivolve] Lv.4 [Eosmon]: Cost 3
// [On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand
//   without paying the cost. If they don't, you may play 1 white Tamer card with a
//   play cost of 4 or less from your hand without paying the cost. Then,
//   <De-Digivolve 1> 1 of your opponent's Digimon for every 2 Tamers.
// [Opponent's Turn] (inherited) When your opponent attacks, you may switch the attack
//   target to 1 of your unsuspended [Eosmon]. [Once Per Turn]
//
// KB Q2843: the De-Digivolve happens regardless of whether a Tamer was played.
//
// "For every 2 Tamers" means count of (all Tamers in play) / 2 rounded down, applied
// as the count of De-Digivolves (each targeting the same 1 Digimon, OR 1 per each 2
// Tamers applied to 1 target). The correct reading is: you perform De-Digivolve 1 on
// 1 of your opponent's Digimon for each group of 2 Tamers you have.
// The scaling field: per:2, unit:"cards" (counting Tamers), result = count of times
// De-Digivolve fires. The "amount" per application is 1.
// The current IR had per:2 and unit:"cards" which is the correct shape — but the
// auditor flagged ambiguity. The correct encoding: amount:1 (per-application), count
// determined by scaling (floor(tamerCount/2)). The interpreter's DeDigivolve accepts
// a target count:1 and should repeat based on scaling. Use count:"scaling" with
// the per:2 Tamer filter.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "opponent",
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
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "White"
              ],
              "playCostLte": 4
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "they don't"
          },
          "optional": true
        },
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
          "scaling": {
            "per": 2,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "cards",
            "scalesCount": true
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
              "controller": "opponent",
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
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "White"
              ],
              "playCostLte": 4
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "condition": {
            "kind": "ifThisEffectDidNotAct",
            "raw": "they don't"
          },
          "optional": true
        },
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
          "scaling": {
            "per": 2,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "cards",
            "scalesCount": true
          }
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "RedirectAttack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "unsuspended": true,
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Eosmon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              },
              "optional": true
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Eosmon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-075", compiled);
