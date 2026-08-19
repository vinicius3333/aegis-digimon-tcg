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
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "hand",
          "bindResultAs": "returned",
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 1, "filter": {"kind": ["Digimon"], "levels": [3]},
            "raw": "a level 3 Digimon card Is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "levels": [
                3
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "condition": {
            "kind": "bindingEmpty",
            "ref": "returned",
            "raw": "there isn't"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "to": "hand",
          "bindResultAs": "returned",
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast", "count": 1, "filter": {"kind": ["Digimon"], "levels": [3]},
            "raw": "a level 3 Digimon card Is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "levels": [
                3
              ]
            },
            "count": 1,
            "from": [
              "hand"
            ]
          },
          "condition": {
            "kind": "bindingEmpty",
            "ref": "returned",
            "raw": "there isn't"
          },
          "optional": true
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
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Lanamon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-024", compiled);
