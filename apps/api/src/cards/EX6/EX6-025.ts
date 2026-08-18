// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd",
          "optional": true
        },
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "name": "Gokuumon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Sagomon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Cho-Hakkaimon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Shakamon"
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom",
          "condition": {
            "kind": "raw",
            "raw": "DigiXrosing"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd",
          "optional": true
        },
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "name": "Gokuumon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Sagomon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Cho-Hakkaimon"
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "name": "Shakamon"
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom",
          "condition": {
            "kind": "raw",
            "raw": "DigiXrosing"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "zone": "digivolutionCards",
                  "hostFilter": {
                    "isSelfRef": true
                  },
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Yellow"
                  ]
                },
                "count": 1
              },
              "to": "hand"
            }
          ]
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd",
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Gokuumon",
            "Sagomon",
            "Cho-Hakkaimon"
          ]
        }
      ],
      "count": 2,
      "maxMaterials": 1
    }
  ]
};

registerIrCard("EX6-025", compiled);
