// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              }
            }
          ]
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
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

registerIrCard("BT13-112", compiled);
