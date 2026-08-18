// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Tamer"
            ]
          },
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
                "count": 1
              },
              "restriction": "cannotActivateWhenDigivolving",
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Pulsemon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "level": 4,
      "traits": [
        "SEEKERS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-034", compiled);
