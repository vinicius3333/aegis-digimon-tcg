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
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "battleArea",
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Green"
              ]
            },
            "unit": "cards"
          },
          "bindResultAs": "suspendedByMegaGargomon"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent"
            },
            "count": "all",
            "sameTarget": true
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "to": "hand"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-029", compiled);
