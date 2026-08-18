// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 6
              }
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "hand",
            "op": "gte",
            "value": 8,
            "raw": "they have 8 or more cards in their hand"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenEffectAddsToOpponentHand",
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "levels": [
                    3
                  ]
                },
                "count": 1
              },
              "to": "hand",
              "condition": {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                },
                "raw": "you have a Tamer"
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX4-022", compiled);
