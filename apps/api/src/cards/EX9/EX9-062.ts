// @ts-nocheck
// EX9-062 SkullGreymon — hand-fixed IR.
// Scaling corrected to target face-down digivolution cards (faceDown:true in filter).
// Engine capability gap: faceDown filter in Scaling.filter not yet implemented (LANE_H.md).
// Current engine counts all digivolution cards until faceDown filter is added.
//
// "This card is also treated as level 4 for [Kimeramon]'s assembly" — the GrantStatic
// grant:"name" tokens:["Kimeramon"] is the best current approximation; it is not a literal
// name grant but allows the card to match Kimeramon's assembly material slots. A dedicated
// grantAssemblyMaterial primitive would be more faithful but doesn't exist yet.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
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
          "grant": "name",
          "tokens": [
            "Kimeramon"
          ]
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "faceDown": true
            },
            "unit": "digivolutionCards"
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine"
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "faceDown": true
            },
            "unit": "digivolutionCards"
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
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
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
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
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [
    "scaling counts all digivolution cards; faceDown filter in Scaling.filter not yet implemented (LANE_H.md)",
    "GrantStatic name:Kimeramon is an approximation; faithful encoding needs grantAssemblyMaterial primitive"
  ],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "DM"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX9-062", compiled);
