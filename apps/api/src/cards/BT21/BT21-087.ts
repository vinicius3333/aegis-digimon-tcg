// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourTurn",
      "actions": [
        {
          "kind": "SetMemory",
          "value": 3,
          "condition": {
            "kind": "memoryAtMost",
            "value": 2
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "orFilters": [
            {
              "add": [
                {
                  "filter": {
                    "controllerDefault": "mine",
                    "kind": ["Digimon"],
                    "nameOrTrait": [
                      {
                        "tokens": ["Vemmon"],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1,
                  "playWithoutCost": true
                }
              ]
            },
            {
              "add": [
                {
                  "filter": {
                    "controllerDefault": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": ["Vemmon"],
                        "match": "text"
                      }
                    ]
                  },
                  "count": 1,
                  "to": "hand"
                }
              ]
            }
          ],
          "rest": "trash"
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

registerIrCard("BT21-087", compiled);
