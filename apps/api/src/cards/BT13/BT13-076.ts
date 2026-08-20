// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Etemon",
                  "Sukamon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -3000,
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "opponent",
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
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Etemon",
                    "Sukamon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Etemon",
                    "Sukamon"
                  ],
                  "match": "name"
                }
              ]
            }
          },
          "restriction": "cannotReturnToHandOrDeck",
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "nameOrTrait": [
        {
          "tokens": [
            "Etemon",
            "Sukamon"
          ],
          "match": "name"
        }
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT13-076", compiled);
