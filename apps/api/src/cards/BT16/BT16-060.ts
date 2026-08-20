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
          "add": [],
          "rest": "deckBottom"
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 1,
          "raw": "reduce the play costs of all of your opponent's Digimon in the battle area by 1 for the turn",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "revealed",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "D-Brigade",
                    "DigiPolice"
                  ],
                  "match": "trait"
                }
              ]
            },
            "unit": "cards"
          },
          "target": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ],
            "zone": "battleArea"
          },
          "duration": "forTurn"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 4
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
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [],
          "rest": "deckBottom"
        },
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 1,
          "raw": "reduce the play costs of all of your opponent's Digimon in the battle area by 1 for the turn",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "revealed",
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "D-Brigade",
                    "DigiPolice"
                  ],
                  "match": "trait"
                }
              ]
            },
            "unit": "cards"
          },
          "target": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ],
            "zone": "battleArea"
          },
          "duration": "forTurn"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 4
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "D-Brigade",
                  "DigiPolice"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
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

registerIrCard("BT16-060", compiled);
export { compiled };
