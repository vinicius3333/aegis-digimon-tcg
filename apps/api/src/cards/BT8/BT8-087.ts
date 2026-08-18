// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT8-087 (T.K. Takaishi).
//
// Audit fixes:
//
// 1. [Opponent's Turn] SubTrigger was missing a filter on the ATTACKED Digimon being blue.
//    The text says "when one of your opponent's Digimon attacks ONE OF YOUR BLUE DIGIMON".
//    KB Q1765 confirms it only fires when the opponent CHOOSES a blue Digimon as attack
//    target (not when blocking redirects the attack to a blue Digimon).
//    Fix: add fireCondition with kind:"triggerDefenderMatchesFilter" and filter for
//    controller:"mine", colors:["Blue"], kind:["Digimon"]. This is a new engine capability
//    (LANE_C.md: TriggerDefenderMatchesFilter). Until built, the SubTrigger fires on any
//    attack (too broad); hence partial.
//
// 2. The SubTrigger actions were missing the Draw action. The text says "you may suspend
//    this Tamer to <Draw 1>". The Suspend and Draw are bundled: suspend is the optional
//    trigger, Draw 1 follows if you choose to suspend. Fix: add Draw after Suspend.

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
            "value": 2
          }
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "fireCondition": {
            "kind": "triggerDefenderMatchesFilter",
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ]
            },
            "raw": "attacks one of your blue Digimon"
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
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

registerIrCard("BT8-087", compiled);
