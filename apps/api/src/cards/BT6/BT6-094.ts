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
            "kind": "not",
            "condition": {
              "kind": "opponentHas",
              "filter": { "zone": "battleArea", "controllerDefault": "opponent", "kind": ["Digimon"] },
              "count": 3
            }
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
                "value": 13000
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 3,
            "raw": "your opponent has 3 or more Digimon in play"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-094", compiled);
