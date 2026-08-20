// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "stopAtLevel": 3
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBeDeleted",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "cost": {
                "kind": "deleteOwn",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "excludeSelf": true,
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Sukamon"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "raw": "by deleting 1 other Digimon with [Sukamon] in its name"
              },
              "optional": true,
              "abortOnDecline": true
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

registerIrCard("BT13-065", compiled);
