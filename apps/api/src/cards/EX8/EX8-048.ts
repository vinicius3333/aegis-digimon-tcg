// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Close"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have 1 or fewer Tamers"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "playCostLte": 4
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX8-048", compiled);
