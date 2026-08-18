// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
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
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing the top card of your security stack"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
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
          "amount": -2000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "raw",
            "raw": "there're 6 or fewer total cards in both players' security stacks"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-038", compiled);
