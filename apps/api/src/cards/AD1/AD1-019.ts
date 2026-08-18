// @ts-nocheck
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
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "actions": [
            {
              "kind": "PlayFromZone",
              "target": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon",
                  "Option"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "ADVENTURE"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand"
              ],
              "payCost": true,
              "optional": true,
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
              "costReduction": 1,
              "scaling": {
                "per": 2,
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ]
                },
                "unit": "colors"
              }
            }
          ],
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "ADVENTURE"
                ],
                "match": "trait"
              }
            ],
            "kind": [
              "Digimon"
            ]
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("AD1-019", compiled);
