// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// OnDeletion: play 1 ShootingStarmon from under Tamers (optional); then place
// 1 Starmons AND 1 Pickmons from trash as bottom digivolution cards of the
// played ShootingStarmon (Q&A: place whichever is available).

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decoy",
          "raw": "＜Decoy ([Xros Heart] trait)＞"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "digivolutionCards",
              "hostFilter": {
                "kind": [
                  "Tamer"
                ]
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "ShootingStarmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "payCost": false,
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Starmons"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "ShootingStarmon"
                ],
                "match": "name"
              }
            ]
          },
          "position": "bottom"
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Pickmons"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "ShootingStarmon"
                ],
                "match": "name"
              }
            ]
          },
          "position": "bottom"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
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
          "amount": -2000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                { "tokens": ["Xros Heart"], "match": "trait" }
              ]
            },
            "raw": "this Digimon has the [Xros Heart] trait"
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
        "Xros Heart"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT19-031", compiled);
