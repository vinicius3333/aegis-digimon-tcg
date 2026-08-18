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
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "gte",
                "value": 8000
              }
            },
            "count": 1
          },
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent"
            },
            "raw": "your opponent has 4 or less memory"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "raw",
            "raw": "they have 4 or more"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "gte",
                "value": 8000
              }
            },
            "count": 1
          },
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent"
            },
            "raw": "your opponent has 4 or less memory"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "raw",
            "raw": "they have 4 or more"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 7000
              }
            },
            "count": 1
          },
          "to": "hand"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-016", compiled);
