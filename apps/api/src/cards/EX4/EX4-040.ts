// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Nene Amano"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Nene Amano"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you don't have [Nene Amano] in play"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 1,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Blue Flare",
                      "Twilight"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX4-040", compiled);
