// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [{ "tokens": ["Jellymon"], "match": "name" }]
                }
              },
              {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": ["Digimon"],
                  "digivolutionStackNameOrTrait": [{ "tokens": ["Jellymon"], "match": "nameExact" }]
                }
              }
            ],
            "raw": "you have a Digimon with [Jellymon] in its name or with [Jellymon] in its digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-096", compiled);
