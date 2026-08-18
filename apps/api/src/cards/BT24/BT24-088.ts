// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Asuna Shiroki"
                  ],
                  "match": "name"
                }
              ]
            },
            "orFilters": [
              {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Three Musketeers"
                    ],
                    "match": "any"
                  }
                ]
              }
            ],
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "memoryAtMost",
            "value": 4
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by returning this Tamer to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 2,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Three Musketeers"
                    ],
                    "match": "any"
                  },
                  {
                    "tokens": [
                      "TS"
                    ],
                    "match": "trait"
                  }
                ],
                "zone": "hand"
              },
              "count": 1
            },
            "raw": "By trashing 1 card with [Three Musketeers] in its text or the [TS] trait from your hand"
          },
          "optional": true,
          "abortOnDecline": true
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
  "coverage": "full",
  "residual": []
};

registerIrCard("BT24-088", compiled);
