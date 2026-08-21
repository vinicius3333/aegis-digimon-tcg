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
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        },
        {
          "kind": "PlaceUnder",
          "fromDeckTop": true,
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "DATA SQUAD"
                ],
                "match": "trait"
              }
            ]
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
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        },
        {
          "kind": "PlaceUnder",
          "fromDeckTop": true,
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "DATA SQUAD"
                ],
                "match": "trait"
              }
            ]
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "handAtMost", "value": 7,
            "raw": "your hand has 7 or fewer cards"
          }
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
      "level": 3,
      "traits": [
        "DATA SQUAD"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST24-03", compiled);
