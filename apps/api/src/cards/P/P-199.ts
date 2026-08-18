// @ts-nocheck
// HAND-FIXED IR for P-199 (Dan Yuki) — do not regenerate. The "[Your Turn] When any of
// your [TS]-trait Digimon would be played, by suspending this Tamer, reduce their play
// costs by 1" was compiled as a `wouldBePlayed` Replacement with no consume site (the play
// path never read it). Modeled instead with existing primitives: a continuous play-cost
// `CostModifier` (-1 for [TS] Digimon, gated on this Tamer being unsuspended so it lapses
// once the cost is paid) plus a `whenPlayed` watcher that suspends this Tamer when a [TS]
// Digimon enters — the "by suspending this Tamer" cost.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
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
          "duration": "forTheTurn",
          "condition": {
            "kind": "memoryAtMost",
            "value": 4
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "play",
          "amount": -1,
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            }
          },
          "condition": {
            "kind": "selfUnsuspended"
          }
        },
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "TS"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
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
  "coverage": "partial",
  "residual": []
};

registerIrCard("P-199", compiled);
