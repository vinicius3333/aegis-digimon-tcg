// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
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
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Blue"
                  ],
                  "levelComparison": {
                    "op": "lte",
                    "value": 4
                  },
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "CS"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "digivolutionCards"
              ],
              "payCost": false,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
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
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Blue"
                  ],
                  "levelComparison": {
                    "op": "lte",
                    "value": 4
                  },
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "CS"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "digivolutionCards"
              ],
              "payCost": false,
              "optional": true
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
      "level": 4,
      "traits": [
        "CS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT23-023", compiled);
