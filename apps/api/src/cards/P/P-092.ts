// @ts-nocheck
// Hand-fixed IR for P-092 — non-inherited digivolve ignores requirements per card text.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": ["Groundramon"],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": ["Wingdramon"],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              },
              "payCost": 3,
              "ignoreRequirements": true,
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": ["Groundramon"],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": ["Wingdramon"],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              },
              "payCost": false,
              "optional": true
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};
registerIrCard("P-092", compiled);
