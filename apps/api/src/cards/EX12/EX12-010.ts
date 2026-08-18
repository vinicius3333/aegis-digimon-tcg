// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// digivolutionRequirement[0]: names:["Agumon"] correctly encodes "w/[Agumon] in name" —
// the engine resolves names via baseDef.nameEn.includes(n) (substring match), not exact
// equality. Auditor "exact match" finding is a false positive.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Greymon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "VB",
                    "ME"
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
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Greymon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "VB",
                    "ME"
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
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": [
        "Agumon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "traits": [
        "ME",
        "VB"
      ],
      "cost": 2,
      "isAlternate": true,
      "level": 3
    }
  ]
};

registerIrCard("EX12-010", compiled);
