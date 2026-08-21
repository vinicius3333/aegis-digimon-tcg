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
          "keyword": "Alliance",
          "raw": "＜Alliance＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
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
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Glowing Dawn"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "cost": {
            "kind": "trashBottomFaceDownUnderTamer",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ]
              },
              "count": 1
            },
            "raw": "by trashing the bottom face-down card from under any of your Tamers"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 3,
          "raw": "play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3",
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true,
          "abortOnDecline": true
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Glowing Dawn"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "cost": {
            "kind": "trashBottomFaceDownUnderTamer",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ]
              },
              "count": 1
            },
            "raw": "by trashing the bottom face-down card from under any of your Tamers"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 3,
          "raw": "play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3",
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true,
          "abortOnDecline": true
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
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Glowing Dawn"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Tamer"
                ]
              },
              "count": 1
            },
            "raw": "By trashing the bottom face-down card from under any of your Tamers"
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
      "traits": [
        "Glowing Dawn"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST23-08", compiled);
