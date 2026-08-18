// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
                "Digimon",
                "Tamer"
              ],
              "playCostLte": 3,
              "playCostLteScaling": {
                "per": 1,
                "filter": {
                  "controller": "mine",
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
                "unit": "trash"
              }
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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "playCostLte": 3,
              "playCostLteScaling": {
                "per": 1,
                "filter": {
                  "controller": "mine",
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
                "unit": "trash"
              }
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
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
          ],
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
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
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "destination": "security",
            "position": "top",
            "raw": "by placing 1 card with [Etemon]/[Sukamon] in its name from your hand on top of your security stack"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-054", compiled);
