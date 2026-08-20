// @ts-nocheck
// EX9-062 SkullGreymon — hand-fixed IR.
// Scaling corrected to target face-down digivolution cards (faceDown:true in filter).
// Scaling uses the dedicated face-down digivolution-card counter.
//
// "This card is also treated as level 4 for [Kimeramon]'s assembly" is enforced by the
// shared Assembly material matcher, independently of the printed level 5.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
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
            "unit": "selfFaceDownDigivolutionCards"
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
            "unit": "selfFaceDownDigivolutionCards"
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
  "residual": [],
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
