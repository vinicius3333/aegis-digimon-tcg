// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
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
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon with [Armor Form] in its traits in play"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "topCardOnly": true
          }
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "digivolveTarget"
          },
          "into": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Armor Form"
                ],
                "match": "trait"
              }
            ]
          },
          "from": ["hand"],
          "payCost": true,
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "fromSelectionRef": "digivolveTarget",
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDigivolved"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Free"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-110", compiled);
