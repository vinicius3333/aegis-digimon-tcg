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
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": "all"
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
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": "all"
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
              "kind": "Modal",
              "choose": 1,
              "optional": true,
              "options": [
                [
                  {
                    "kind": "Return",
                    "target": {
                      "filter": {
                        "controller": "mine",
                        "zone": "digivolutionCards",
                        "hostFilter": {"isSelfRef": true},
                        "kind": ["Digimon"],
                        "levelComparison": {"op": "lte", "value": 4},
                        "colors": ["Red"]
                      },
                      "count": 1
                    },
                    "to": "hand",
                    "optional": true
                  }
                ],
                [
                  {
                    "kind": "PlayWithoutCost",
                    "target": {
                      "filter": {
                        "levelComparison": {"op": "lte", "value": 4},
                        "colors": ["Red"],
                        "kind": ["Digimon"]
                      },
                      "count": 1
                    },
                    "fromOwnDigivolutionStack": true,
                    "payCost": false,
                    "optional": true
                  }
                ]
              ]
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Grumblemon"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("BT18-017", compiled);
export { compiled };
