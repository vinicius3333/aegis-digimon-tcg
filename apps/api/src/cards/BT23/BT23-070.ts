// @ts-nocheck
// Hand-authored override: KB Q5341 — attack after deletion is mandatory when Belphemon in stack.
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
          "keyword": "Rush",
          "raw": "＜Rush＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
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
              "superlative": "highestLevel"
            },
            "count": "all"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attacks without suspending",
          "duration": "forTheTurn",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Belphemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "a card with [Belphemon] in its name is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "withoutSuspending": true,
          "mandatory": true,
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Belphemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "a card with [Belphemon] in its name is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
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
                  "Belphemon: Sleep Mode"
                ],
                "match": "name"
              }
            ]
          },
          "payCost": false,
          "from": [
            "trash"
          ],
          "ignoreRequirements": true,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 6,
      "names": [
        "Belphemon"
      ],
      "excludeTraits": [
        "X Antibody"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT23-070", compiled);
