// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
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
              "superlative": "lowestDP"
            },
            "count": 1
          }
        },
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
              ]
            },
            "unit": "cards"
          }
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
              "superlative": "lowestDP"
            },
            "count": 1
          }
        },
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
              ]
            },
            "unit": "cards"
          }
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
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Seven Great Demon Lords"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "underFilter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gate of Deadly Sins"
                    ],
                    "match": "name"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-058", compiled);
