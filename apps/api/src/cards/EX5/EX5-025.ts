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
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "digivolutionCards"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "digivolutionCards": "none",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "digivolutionCards"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "digivolutionCards": "none",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDigivolutionTrashed",
          "sourceFilter": {
            "controller": "opponent"
          },
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
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-025", compiled);
