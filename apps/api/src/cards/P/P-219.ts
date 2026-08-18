// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-219 Flame Inferno (Option, cost 9)
//
// "When this card would be used, if your opponent has 10 or more cards in their
//   trash, reduce the use cost by 3."
// [Main] Delete 1 of your opponent's level 6 or lower Digimon.
//   Then, by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon, you may
//   play 1 [Creepymon] from your trash without paying the cost.
//   The Digimon this effect played gains <Rush> and <Blocker> until your
//   opponent's turn ends.
// [Security] Activate this card's [Main] effects.
//
// Fixes vs prior IR:
// - Static CostModifier: conditional on opponent.trash >= 10; amount 3 (was 5);
//   target is self; costType "use" (Option card use cost).
// - Main effect is unchanged (was already faithful).
// - Security ActivateMain unchanged.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "CostModifier",
          "costType": "use",
          "mode": "reduce",
          "amount": 3,
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "duration": "permanent",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "trash",
            "op": "gte",
            "value": 10,
            "raw": "if your opponent has 10 or more cards in their trash"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 6
              }
            },
            "count": 1
          }
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Creepymon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Evil",
                      "Fallen Angel"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-219", compiled);
