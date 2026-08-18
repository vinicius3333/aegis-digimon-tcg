// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Leomon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Leomon]/[X Antibody] is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Fortitude",
              "raw": "＜Fortitude＞"
            }
          },
          "while": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Leomon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Leomon]/[X Antibody] is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Recovery",
          "amount": 1,
          "raw": "＜Recovery +1 (Deck)＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Leomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-139", compiled);
