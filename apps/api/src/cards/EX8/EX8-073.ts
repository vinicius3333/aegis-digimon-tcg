// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 4000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gallantmon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Gallantmon]/[X Antibody] is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 4000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gallantmon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Gallantmon]/[X Antibody] is in this Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 10000
              }
            },
            "count": 1
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this didn't delete"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 10000
              }
            },
            "count": 1
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this didn't delete"
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
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDigimonEffects",
          "duration": "permanent",
          "condition": {
            "kind": "memoryAtMost",
            "value": 0,
            "controller": "mine"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Gallantmon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-073", compiled);
