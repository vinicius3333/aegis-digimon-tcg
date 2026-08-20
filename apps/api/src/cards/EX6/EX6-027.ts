// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "condition": {
        "kind": "youHave",
        "filter": {
          "controllerDefault": "mine",
          "zone": "security"
        },
        "raw": "you have at least 1 security card (KB Q3744: effect can't activate with 0 security cards)"
      },
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
          "amount": -8000,
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
            "raw": "By trashing the top or bottom card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "condition": {
        "kind": "youHave",
        "filter": {
          "controllerDefault": "mine",
          "zone": "security"
        },
        "raw": "you have at least 1 security card (KB Q3744: effect can't activate with 0 security cards)"
      },
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
          "amount": -8000,
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
            "raw": "By trashing the top or bottom card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
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
                "keyword": "SecurityAttack",
                "amount": 1,
                "raw": "＜Security Attack +1＞"
              },
              "duration": "forTheTurn",
              "condition": {
                "kind": "isYourTurn",
                "raw": "it's your turn"
              },
              "optional": true,
              "abortOnDecline": true
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "condition": {
                "kind": "isYourTurn",
                "raw": "it's your turn"
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
              "condition": {
                "kind": "isOpponentsTurn",
                "raw": "it's your opponent's turn"
              }
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
      "names": [
        "Angewomon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX6-027", compiled);
