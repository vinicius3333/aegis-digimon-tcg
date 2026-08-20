// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Arukenimon",
                  "Mummymon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 3,
              "raw": "reduce the play cost by 3",
              "cost": {
                "kind": "deleteOwn",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by deleting this Tamer"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Myotismon"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "DelayedDelete",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
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

registerIrCard("BT16-089", compiled);
export { compiled };
