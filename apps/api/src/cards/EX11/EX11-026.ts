// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "digivolutionRequirement": [
    {
      "level": 2,
      "cost": 0,
      "isAlternate": true
    }
  ],
  "effects": [
    {
      "trigger": "WhenMoving",
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
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Vortex Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect suspended your Digimon"
          }
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
            "count": 1
          },
          "optional": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Vortex Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect suspended your Digimon"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenBattleWon",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "GainMemory",
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
  "residual": []
};

registerIrCard("EX11-026", compiled);
