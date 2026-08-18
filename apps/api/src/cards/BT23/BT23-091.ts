// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-091 (Wolkenapalm, Red/CS Option).
// Text:
//   While you have a Digimon or Tamer with the [CS] trait on the field, you can ignore
//   this card's color requirements.
//   [Main] Delete 1 of your opponent's Digimon with the lowest DP. Then, place this
//   card in the battle area.
//   [Your Turn] When one of your [CS] trait Digimon attacks, ＜Delay＞
//   ・Delete 1 of your opponent's Digimon with the lowest DP.
//   [Security] Delete 1 of your opponent's Digimon with the lowest DP. Then, place this
//   card in the battle area.
// Fixes vs AUTO-GENERATED:
//   - YourTurn SubTrigger: whenAttacking on CS-trait Digimon fires GainKeyword Delay
//     untilTurnEnd (grants Delay to this option so the Main+Delay bullet can be declared),
//     matching the engine pattern established by BT23-092.
//   - Delete lowest DP (the Delay bullet) is in a separate trigger:"Main" effect with
//     keywords:[{keyword:"Delay"}] — it fires when the Delay resolves, not unconditionally
//   - Removed the stray unconditional Delete that was outside the SubTrigger
const compiled: CompiledCard = {
  "effects": [
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
              "zone": "field",
              "controllerDefault": "mine",
              "kind": ["Digimon", "Tamer"],
              "nameOrTrait": [
                {
                  "tokens": ["CS"],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon or Tamer with the [CS] trait on the field (battle area or breeding area, per KB Q5364)"
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
              "kind": ["Digimon"],
              "superlative": "lowestDP"
            },
            "count": 1
          }
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["CS"],
                "match": "trait"
              }
            ]
          },
          "actions": [
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
                "keyword": "Delay",
                "raw": "＜Delay＞"
              },
              "duration": "untilTurnEnd"
            }
          ],
          "raw": "When one of your [CS] trait Digimon attacks, this card gains ＜Delay＞ until end of turn"
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
              "kind": ["Digimon"],
              "superlative": "lowestDP"
            },
            "count": 1
          }
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
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
              "kind": ["Digimon"],
              "superlative": "lowestDP"
            },
            "count": 1
          }
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-091", compiled);
