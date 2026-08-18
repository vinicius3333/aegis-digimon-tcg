// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "MetalGarurumon"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 4,
          "ignoreRequirements": true,
          "optional": true,
          "condition": {
            "kind": "orCondition",
            "conditions": [
              {
                "kind": "opponentHas",
                "filter": {
                  "controllerDefault": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "dp": {
                    "op": "gte",
                    "value": 10000
                  }
                },
                "raw": "your opponent has a Digimon with 10000 DP or more"
              },
              {
                "kind": "zoneColorCount",
                "seat": "mine",
                "zone": "battleArea",
                "cardType": "Tamer",
                "unit": "distinctColors",
                "op": "gte",
                "value": 3,
                "raw": "your Tamers have 3 or more total colors"
              }
            ],
            "raw": "your opponent has a Digimon with 10000 DP or more, or your Tamers have 3 or more total colors"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "traits": [
        "ADVENTURE"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST21-10", compiled);
