// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Fortitude",
          "raw": "＜Fortitude＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 1,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                },
                "keywords": [
                  "Fortitude"
                ]
              },
              "count": 1,
              "to": "play"
            }
          ],
          "rest": "hand"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 1,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                },
                "keywords": [
                  "Fortitude"
                ]
              },
              "count": 1,
              "to": "play"
            }
          ],
          "rest": "hand"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "digivolutionCards": "none",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "keywords": [
                "Fortitude"
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-042", compiled);
