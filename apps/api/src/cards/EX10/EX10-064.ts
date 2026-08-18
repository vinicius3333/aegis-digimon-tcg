// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Bagra Army",
                      "Twilight"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": ["hand", "trash"]
            },
            "underTarget": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "position": "bottom",
            "raw": "By placing 1 [Bagra Army] or [Twilight] trait Digimon card from your hand or trash under this Tamer"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Bagra Army",
                  "Twilight"
                ],
                "match": "trait"
              }
            ],
            "hasDigiXros": true
          },
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer"
          },
          "actions": [
            {
              "kind": "DigiXrosExtraMaterial",
              "options": [
                {
                  "from": "underTamers",
                  "count": 1
                },
                {
                  "from": "trash",
                  "count": 1
                }
              ],
              "raw": "1 card from under your Tamers and 1 card in your trash can also be placed for their DigiXros"
            }
          ]
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "1 card from under your Tamers and 1 card in your trash can also be placed for their DigiXros (DigiXrosExtraMaterial capability needed)"
  ]
};

registerIrCard("EX10-064", compiled);
