// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 3,
            "upTo": true
          },
          "optional": true
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon"
              ]
            },
            "count": 3,
            "upTo": true
          },
          "optional": true
        },
        {
          "kind": "GainMemory",
          "amount": 1,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "isSelfRef": true
          },
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
                "keyword": "Piercing",
                "raw": "＜Piercing＞"
              },
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": 3000,
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "NSp"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-044", compiled);
