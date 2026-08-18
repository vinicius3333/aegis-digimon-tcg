// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "levels": [
              4
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Angel",
                  "Free"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 1,
          "optional": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "levels": [
              4
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Angel",
                  "Free"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 1,
          "optional": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "hasAny"
            },
            "count": 1
          },
          "amount": 1,
          "fromTop": true
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
        "Tokomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-016", compiled);
