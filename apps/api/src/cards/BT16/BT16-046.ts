// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 2
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "suspended": true
            },
            "count": "all"
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
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
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 2
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "suspended": true
            },
            "count": "all"
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "suspended": true,
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
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
                "keyword": "SecurityAttack",
                "amount": 1,
                "raw": "＜Security Attack +1＞"
              },
              "duration": "forTheTurn"
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
      "names": [
        "Dinobeemon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "level": 5,
      "traits": [
        "Insectoid"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-046", compiled);
