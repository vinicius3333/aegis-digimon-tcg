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
      "actions": [],
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
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
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Tyrannomon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Dinosaur"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 1,
          "optional": true,
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Tyrannomon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "X Antibody"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "a card with [Tyrannomon] in its name or [X Antibody] is in this Digimon's digivolution cards"
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
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Tyrannomon"
      ],
      "excludeTraits": ["X Antibody"],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-160", compiled);
