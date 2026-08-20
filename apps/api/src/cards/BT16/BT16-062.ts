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
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
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
          "amount": 1
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 3
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
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
          "amount": 1
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 3
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "copyEffectsFromDigivolution": {
              "filter": "This Digimon gains all of the effects on cards with [Gammamon] in their names in this Digimon's digivolution cards"
            }
          },
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "copyEffectsFromDigivolution": {
              "filter": "This Digimon gains all of the effects on cards with [Gammamon] in their names in this Digimon's digivolution cards"
            }
          },
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Gammamon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-062", compiled);
export { compiled };
