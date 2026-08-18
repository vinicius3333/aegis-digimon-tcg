// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Partition",
          "raw": "＜Partition (black Lv.4 & yellow Lv.4)＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDigimonEffects",
          "tokens": [],
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "opponent",
          "source": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "level": {
                "lte": {
                  "kind": "chooseEitherSecurityCount"
                }
              }
            },
            "count": 1
          },
          "from": [
            "security"
          ],
          "toTop": false,
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        },
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Angel"
          ]
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Partition",
          "raw": "＜Partition (black Lv.4 & yellow Lv.4)＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "dnaDigivolveRequirement": [
    {
      "cost": 0,
      "materials": [
        {
          "color": "Black",
          "level": 4
        },
        {
          "color": "Yellow",
          "level": 4
        }
      ]
    }
  ]
};

registerIrCard("BT16-063", compiled);
