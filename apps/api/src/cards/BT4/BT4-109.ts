import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited: all three conditional keywords use the Digimon selected by the DP boost,
// and the 16000-DP gate is evaluated for the result of the fixed +3000 boost
// (equivalently, current DP >= 13000 before that modifier is recomputed; KB Q1274-Q1276).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
          "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine"
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "lastTargetDpAtLeast",
            "value": 13000
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine"
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "lastTargetDpAtLeast",
            "value": 13000
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine"
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "lastTargetDpAtLeast",
            "value": 13000
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-109", compiled);
