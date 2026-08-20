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
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue",
                "Purple"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "SubTrigger",
          "event": "endOfOpponentTurn",
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "to": "hand"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Rule",
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
          "grant": "trait",
          "tokens": [
            "Dark Animal"
          ]
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "levels": [
                    3
                  ]
                },
                "count": 1
              },
              "to": "hand"
            }
          ]
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
        "Cerberusmon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-025", compiled);
export { compiled };
