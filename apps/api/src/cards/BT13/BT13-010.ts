// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Garudamon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "ignoreRequirements": true,
          "optional": true,
          "condition": {
            "kind": "raw",
            "raw": "played by an effect"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Kristy Damon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by returning 1 of your [Kristy Damon]s to the hand"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-010", compiled);
