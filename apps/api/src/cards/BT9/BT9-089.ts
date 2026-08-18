// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override (runtime-effect fix). [Your Turn] "When one of your Digimon digivolves
// into a black level 6 Digimon, IT gains ＜Blocker＞" — the grant targets the digivolving
// Digimon (sourceRef:"triggerSubject"), NOT this Tamer (the previous isSelfRef was wrong).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenUnsuspended",
          "fireCondition": {
            "kind": "phaseIs",
            "phase": "Main"
          },
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
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
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "colors": [
              "Black"
            ],
            "levels": [
              6
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "sourceRef": "triggerSubject",
                "filter": {},
                "count": 1
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            }
          ]
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

registerIrCard("BT9-089", compiled);
