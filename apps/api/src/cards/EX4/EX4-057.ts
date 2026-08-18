// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX4-057 (Antylamon).
// Text:
//   [Main] Digivolve from 2-color w/green Lv.4 (cost 3). (When this Digimon attacks, by
//          suspending 1 of your other Digimon, this Digimon adds the suspended Digimon's
//          DP and gains <Security Attack +1> for the attack.)
//   [End of Attack] You may play 1 green Lv.3 Digimon card from your trash without paying
//                   the cost.
//   Inherited [End of Attack][Once Per Turn] If you have another suspended Digimon,
//             return 1 green Digimon from your trash to your hand.
//
// Fixes:
// 1. The parenthetical suspend/+DP effect fires "when this Digimon attacks", not on
//    digivolving — it must be trigger "WhenAttacking", not "WhenDigivolving" (see
//    BT3-004 for the same top-level-trigger pattern).
// 2. digivolutionRequirement: multicolor:true + colors:['Green'] is the established codebase
//    encoding for "2-color w/green" (no colorCount field exists; see interpreter.ts:249,
//    which already requires def.colors.length >= 2 for multicolor:true).
// 3. "By suspending 1 of your other Digimon, [effect]" is a by-cost activation the controller
//    may decline — encoded as the suspend on the ModifyDP action's `cost` field with the
//    action itself `optional:true` (same pattern as BT2-084), not a separate mandatory
//    Suspend action ahead of it.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": {
            "kind": "raw",
            "raw": "+DP equal to the suspended Digimon's DP"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "by suspending 1 of your other Digimon"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
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
                "Green"
              ],
              "levels": [
                3
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
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Green"
              ]
            },
            "count": 1
          },
          "to": "hand",
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
  "residual": [
    "ModifyDP by 'equal to suspended Digimon's DP' is a dynamic source-referenced amount not expressible in structured IR"
  ],
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

registerIrCard("EX4-057", compiled);
