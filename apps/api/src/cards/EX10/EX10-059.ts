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
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isOpponentHand": true
            },
            "count": 1
          },
          "underFilter": {
            "or": [
              {
                "digivolutionBottom": true
              },
              {
                "kind": [
                  "Tamer"
                ]
              }
            ]
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Bagra Army"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 3,
              "from": [
                "trash"
              ]
            },
            "raw": "by placing 3 [Bagra Army] trait Digimon cards from your trash as this Digimon's top digivolution cards",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isOpponentHand": true
            },
            "count": 1
          },
          "underFilter": {
            "or": [
              {
                "digivolutionBottom": true
              },
              {
                "kind": [
                  "Tamer"
                ]
              }
            ]
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Bagra Army"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 3,
              "from": [
                "trash"
              ]
            },
            "raw": "by placing 3 [Bagra Army] trait Digimon cards from your trash as this Digimon's top digivolution cards",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
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
          "grant": {
            "copyEffectsFromDigivolution": {
              "filter": "This Digimon gains all [All Turns] effects on all level 6 [Bagra Army] trait Digimon cards in its digivolution cards"
            }
          },
          "duration": "forTheTurn"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Bagramon"
          ]
        }
      ],
      "count": 3
    }
  ]
};

registerIrCard("EX10-059", compiled);
