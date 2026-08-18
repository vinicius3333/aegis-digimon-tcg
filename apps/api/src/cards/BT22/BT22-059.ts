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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 5
            },
            "count": 1
          }
        },
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDPReductionAndReturn",
          "tokens": [],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Arata Sanada",
                    "Eater Adam"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have [Arata Sanada] or [Eater Adam]"
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
              "playCostLte": 5
            },
            "count": 1
          }
        },
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "immuneToOpponentDPReductionAndReturn",
          "tokens": [],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Arata Sanada",
                    "Eater Adam"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have [Arata Sanada] or [Eater Adam]"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Unidentified"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "PlayToken",
              "tokens": [
                "Diaboromon"
              ],
              "count": 1,
              "payCost": false,
              "optional": true
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
      "traits": [
        "CS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT22-059", compiled);
