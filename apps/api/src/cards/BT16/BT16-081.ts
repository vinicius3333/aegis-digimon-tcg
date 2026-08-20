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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "unsuspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Digimon or Tamers"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "unsuspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon",
                  "Tamer"
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Digimon or Tamers"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
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
            "excludeSelf": true,
            "kind": [
              "Digimon",
              "Tamer"
            ]
          },
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1
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

registerIrCard("BT16-081", compiled);
export { compiled };
