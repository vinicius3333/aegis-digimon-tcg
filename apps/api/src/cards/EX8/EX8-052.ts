// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Device"
                  ],
                  "match": "trait"
                }
              ],
              "kind": [
                "Option"
              ],
              "controller": "mine"
            },
            "count": 1,
            "from": [
              "hand",
              "trash"
            ]
          },
          "payCost": false,
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Cyberdramon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Cyberdramon]/[X Antibody] is in this Digimon's digivolution cards"
          },
          "optional": true
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
              ]
            },
            "count": 1
          },
          "amount": 2,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "controller": "mine",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Option cards in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "trashSecurityTop",
          "controller": "opponent",
          "count": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "battleArea",
                "controller": "mine",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Option cards in the battle area"
          },
          "optional": true,
          "abortOnDecline": true
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
        "Cyberdramon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};
registerIrCard("EX8-052", compiled);
