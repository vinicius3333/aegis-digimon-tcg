// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: By playing 1 [Lucemon: Larva] from trash to your EMPTY breeding area
// without paying the cost, delete 1 of your opponent's Digimon or Tamers.
// [End of All Turns] [Once Per Turn]: Trash top security of opponent's security stack.
// If this effect DIDN'T trash (opponent has no security), delete 1 Digimon and 1 Tamer instead.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "trash",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Lucemon: Larva"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "breeding": true,
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "EndOfAllTurns",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trash",
          "controller": "opponent",
          "target": {
            "filter": {
              "controller": "opponent"
            },
            "count": 1
          },
          "from": [
            "security"
          ],
          "bindResultAs": "trashedSecurity"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "bindingEmpty",
            "ref": "trashedSecurity",
            "raw": "this effect didn't trash (opponent has no security)"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "bindingEmpty",
            "ref": "trashedSecurity",
            "raw": "this effect didn't trash (opponent has no security)"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Lucemon: Chaos Mode"
      ],
      "cost": 6,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-101", compiled);
