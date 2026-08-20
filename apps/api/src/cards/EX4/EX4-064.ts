// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Purple"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Ravemon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Bird",
                  "Avian"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Draw",
              "amount": 1
            },
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "triggerRemovalCause", "removalCause": "byEffect",
                "raw": "that Digimon was deleted by an effect"
              }
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
            "raw": "by suspending this Tamer, Draw 1 card from your deck. If that Digimon was deleted by an effect, gain 1 memory"
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

registerIrCard("EX4-064", compiled);
