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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "amount": 1,
          "source": "deck",
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
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
              "controller": "opponent"
            },
            "count": 1
          },
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "amount": 1,
          "source": "deck",
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if this effect didn't delete"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
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
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {"controller": "mine", "zone": "security", "position": "bottom"},
              "count": 1
            },
            "raw": "by trashing the bottom card of your security stack"
          },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Lucemon"
      ],
      "cost": 6,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-082", compiled);
export { compiled };
