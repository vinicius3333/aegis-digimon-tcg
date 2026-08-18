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
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "opponent"
            },
            "count": 1,
            "untilHandSize": 5
          },
          "trackCount": "trashedThisEffect",
          "chooser": "opponent"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "opponent"
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "opponent"
            },
            "count": 1,
            "untilHandSize": 5
          },
          "trackCount": "trashedThisEffect",
          "chooser": "opponent"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "opponent"
            },
            "unit": "cards"
          }
        }
      ]
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
              "kind": "Prevent",
              "mode": "leavePlay",
              "cost": {
                "kind": "deleteOwn",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Composite"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                },
                "raw": "by deleting 1 of your Digimon with the [Composite] trait Digimon"
              },
              "optional": true,
              "abortOnDecline": true
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
          "event": "onDeletionOf",
          "sourceFilter": {
            "controllerDefault": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon",
              "Tamer"
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "opponent"
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Millenniummon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT19-075", compiled);
