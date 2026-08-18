// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
          "amount": -4000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -2,
            "raw": "＜Security Attack -2＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine"
            },
            "raw": "you have 3 or fewer"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
          "amount": -4000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -2,
            "raw": "＜Security Attack -2＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine"
            },
            "raw": "you have 3 or fewer"
          }
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "raw",
            "raw": "this Digimon has [Pulsemon] in its text"
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "by trashing the top card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
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
      "texts": [
        "Pulsemon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-034", compiled);
