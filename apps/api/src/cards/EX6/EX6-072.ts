import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main] DNA digivolve: 1 level-6 Digimon on field + 1 hand card → level-7 in hand.
// KB Q3822: cannot ignore DNA digivolve requirements.
// Uses the W7-E-2 array form of DnaDigivolveAction.materials (CAPABILITIES-BACKLOG.md),
// each entry resolving independently in its own zone (field, then hand).
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 6
              }
            },
            "raw": "your opponent has a level 6 or higher Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": [
            {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levels": [
                  6
                ]
              },
              "zone": "battleArea",
              "count": 1
            },
            {
              "filter": {
                "controller": "mine"
              },
              "zone": "hand",
              "count": 1
            }
          ],
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "levels": [
              7
            ],
            "zone": "hand"
          },
          "payCost": true,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "gte",
                "value": 6
              }
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-072", compiled);
