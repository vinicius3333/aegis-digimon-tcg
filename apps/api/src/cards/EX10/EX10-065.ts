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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Myotismon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isTriggerSubject": true
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Rush",
                "raw": "＜Rush＞"
              },
              "duration": "forTheTurn"
            },
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ],
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by deleting this Tamer"
          },
          "optional": true,
          "abortOnDecline": true,
          "raw": "When any of your Digimon with [Myotismon] in their names are played, by deleting this Tamer, 1 of those Digimon gains ＜Rush＞ for the turn. Then, gain 1 memory."
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

registerIrCard("EX10-065", compiled);
