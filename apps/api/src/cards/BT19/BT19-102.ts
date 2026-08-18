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
              "controller": "both",
              "kind": [
                "Digimon"
              ],
              "excludeSelf": true
            },
            "count": 1
          },
          "cost": {
            "kind": "playFromDigivolutionCards",
            "hostTarget": {
              "filter": {
                "controller": "both",
                "kind": [
                  "Digimon"
                ],
                "excludeSelf": true
              },
              "count": 1
            },
            "target": {
              "filter": {
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "payCost": false,
            "raw": "By playing 1 level 4 or lower Digimon card from the chosen Digimon’s digivolution cards without paying the cost"
          },
          "optional": false,
          "abortOnDecline": false
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
              "controller": "both",
              "kind": [
                "Digimon"
              ],
              "excludeSelf": true
            },
            "count": 1
          },
          "cost": {
            "kind": "playFromDigivolutionCards",
            "hostTarget": {
              "filter": {
                "controller": "both",
                "kind": [
                  "Digimon"
                ],
                "excludeSelf": true
              },
              "count": 1
            },
            "target": {
              "filter": {
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "payCost": false,
            "raw": "By playing 1 level 4 or lower Digimon card from the chosen Digimon’s digivolution cards without paying the cost"
          },
          "optional": false,
          "abortOnDecline": false
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 5,
              "zone": "underTamers"
            },
            "count": 1
          },
          "from": ["underTamers"],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Luminamon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "names": [
        "Nene Amano"
      ],
      "traits": [
        "Shademon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Nene Amano"
          ]
        }
      ],
      "count": 1
    }
  ]
};

registerIrCard("BT19-102", compiled);
