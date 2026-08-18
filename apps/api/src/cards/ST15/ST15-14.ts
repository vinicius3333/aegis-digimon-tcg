// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q815: blocking causes attack target to switch, so this effect activates on blocks too.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "SetMemory",
          "value": 3,
          "condition": {
            "kind": "memoryAtMost",
            "value": 2,
            "controller": "self",
            "raw": "you have 2 or fewer memory"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttackTargetSwitched",
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            },
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": 2000,
              "duration": "untilTurnEnd"
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer, ＜Draw 1＞ and 1 of your Digimon gets +2000 DP until the end of the turn"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST15-14", compiled);
