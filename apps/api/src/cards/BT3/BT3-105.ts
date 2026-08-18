// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "dpImmune",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "beReturned",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "restriction": "attackPlayers",
          "duration": "forTheTurn"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT3-105", compiled);
