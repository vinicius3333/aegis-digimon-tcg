// @ts-nocheck
// Hand-authored override for ST20-10.
// Fix: [Your Turn] effect has OR condition — "opponent has 10000+ DP Digimon, OR
// your Tamers have 3+ total colors". The declarative effect record only encoded the first
// branch; the second (zoneColorCount) was missing.
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
                  "WarGreymon"
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
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "traits": [
        "ADVENTURE",
        "Hero"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST20-10", compiled);
