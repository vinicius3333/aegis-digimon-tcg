// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
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
                    "controller": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Unidentified"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                },
                "raw": "by deleting 1 of your Digimon with the [Unidentified] trait"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 3
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 3
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "condition": {
            "kind": "selfHasTrait",
            "filter": { "nameOrTrait": [{ "tokens": ["Unidentified"], "match": "trait" }] },
            "raw": "this Digimon had the [Unidentified] trait"
          },
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-039", compiled);
