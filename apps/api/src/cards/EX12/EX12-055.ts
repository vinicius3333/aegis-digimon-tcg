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
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "playCostLte": 5,
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "ME"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "playCostLte": 5,
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "ME"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "Counter",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "levelComparison": {
              "op": "lte",
              "value": 6
            },
            "nameOrTrait": [
              {
                "tokens": [
                  "ME"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "RedirectAttack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
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
        "Machine",
        "ME"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX12-055", compiled);
