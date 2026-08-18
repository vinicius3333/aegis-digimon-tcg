// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Three Musketeers"
                  ],
                  "match": "text"
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
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Option"
              ],
              "zone": "hand"
            },
            "orFilters": [
              {
                "controller": "mine",
                "kind": [
                  "Option"
                ],
                "zone": "digivolutionCards"
              }
            ],
            "count": 1
          }
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Three Musketeers"
                ],
                "match": "text"
              },
              {
                "tokens": [
                  "TS"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand",
            "trash"
          ],
          "reduceCost": 1,
          "payCost": true,
          "optional": true,
          "raw": "1 of your Digimon may digivolve into a Digimon card with [Three Musketeers] in its text or the [TS] trait in the hand or trash with the cost reduced by 1"
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
registerIrCard("BT25-092", compiled);
