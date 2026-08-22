// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenMovedFromBreeding",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Gabumon",
                  "Garurumon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            },
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gabumon"
                  ],
                  "match": "nameExact"
                }
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
                  "Gabumon - Bond of Friendship"
                ],
                "match": "nameExact"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 3,
          "ignoreRequirements": true,
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "amount": 2,
          "condition": {
            "kind": "ifThisEffectDigivolved"
          }
        },
        {
          "kind": "SubTrigger",
          "event": "endOfTurn",
          "once": true,
          "condition": {
            "kind": "securityAtLeast",
            "value": 1
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
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
          "from": [
            "security"
          ],
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-088", compiled);
