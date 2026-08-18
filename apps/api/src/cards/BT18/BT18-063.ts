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
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "beDeleted",
          "duration": "untilOpponentTurnEnd",
          "byOpponentEffectsOnly": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Yellow",
              "Black"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Hybrid"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 1,
          "optional": true
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
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "hasInheritedEffects": true,
                  "controller": "mine",
                  "kind": [
                    "Tamer"
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
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "J.P. Shibayama"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "names": [
        "MetalKabuterimon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-063", compiled);
