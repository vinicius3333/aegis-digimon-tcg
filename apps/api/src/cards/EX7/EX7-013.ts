// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "UseOptionWithoutCost",
          "filter": {
            "kind": [
              "Option"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Three Musketeers"
                ],
                "match": "trait"
              }
            ],
            "controller": "mine"
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true
        },
        {
          "kind": "Draw",
          "amount": 1,
          "untilHandSize": 6,
          "controller": "mine"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "UseOptionWithoutCost",
          "filter": {
            "kind": [
              "Option"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Three Musketeers"
                ],
                "match": "trait"
              }
            ],
            "controller": "mine"
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true
        },
        {
          "kind": "Draw",
          "amount": 1,
          "untilHandSize": 6,
          "controller": "mine"
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "digivolutionCards",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 Option card in this Digimon's digivolution card"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "withoutSuspending": false,
          "optional": false
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "texts": [
        "Three Musketeers"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX7-013", compiled);
