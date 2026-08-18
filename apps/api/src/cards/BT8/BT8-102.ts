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
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "by suspending 1 of your Digimon"
          },
          "optional": true
        },
        {
          "kind": "Restrict",
          "target": {
            "sameTarget": true,
            "filter": {
              "controller": "opponent",
              "suspended": true
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-102", compiled);
