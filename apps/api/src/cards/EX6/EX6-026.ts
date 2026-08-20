// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digiXrosCount"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digiXrosCount"
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
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digiXrosCount"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digiXrosCount"
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
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Yellow"
                  ],
                  "controller": "mine",
                  "zone": "digivolutionCards",
                  "hostFilter": {
                    "isSelfRef": true
                  }
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
            "Sanzomon",
            "Gokuumon",
            "Sagomon"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("EX6-026", compiled);
