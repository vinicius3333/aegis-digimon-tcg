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
          "kind": "SecurityManipulation",
          "op": "addBottom",
          "controller": "opponent",
          "amount": 1,
          "source": "hand",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer security cards"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addBottom",
          "controller": "opponent",
          "amount": 1,
          "source": "hand",
          "condition": {
            "kind": "zoneCount",
            "seat": "opponent",
            "zone": "security",
            "op": "lte",
            "value": 5,
            "raw": "your opponent has 5 or fewer security cards"
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 4000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT21-024", compiled);
