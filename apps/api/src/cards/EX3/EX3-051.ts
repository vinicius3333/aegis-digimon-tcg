// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "playCostLte": 5,
                "nameOrTrait": [
                  {
                    "tokens": [
                      "D-Brigade"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "D-Brigade"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "RevealAdd",
              "revealCount": 2,
              "add": [
                {
                  "filter": {
                    "controllerDefault": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Commandramon"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1,
                  "to": "play",
                  "optional": true
                }
              ],
              "rest": "trash"
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX3-051", compiled);
