// @ts-nocheck
// HAND-FIXED IR for BT22-082 — do not regenerate.
// OnPlay/WhenDigivolving Delete: added playCost lte 7 (text: "play cost 7 or lower").
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCost": {
                "op": "lte",
                "value": 7
              }
            },
            "count": 1
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Arata Sanada"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "selfHasNoDigivolutionCards",
            "raw": "this Digimon has no digivolution cards"
          },
          "optional": true
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
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCost": {
                "op": "lte",
                "value": 7
              }
            },
            "count": 1
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Arata Sanada"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "selfHasNoDigivolutionCards",
            "raw": "this Digimon has no digivolution cards"
          },
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
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Arata Sanada"
                      ],
                      "match": "name"
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
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Arata Sanada"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT22-082", compiled);
