// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 4,
              "raw": "reduce the play cost by 4",
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "controllerDefault": "any",
                    "kind": [
                      "Digimon"
                    ]
                  },
                  "count": 2
                },
                "raw": "by suspending 2 Digimon"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Alliance",
          "raw": "＜Alliance＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Vortex",
          "raw": "＜Vortex＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 8000
              }
            },
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 3000,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "excludeSelf": true,
              "suspended": true,
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
              "kind": "ActivateEffect",
              "target": {
                "filter": {
                  "controllerDefault": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "effectType": "WhenDigivolving",
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX8-074", compiled);
