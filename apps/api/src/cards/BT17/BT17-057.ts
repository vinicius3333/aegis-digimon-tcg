// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
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
          "grant": "digixrosFromTrash",
          "tokens": [],
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "colors": [
                "Black"
              ]
            },
            "raw": "you have a black Tamer"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": ["Digimon"]
          },
            "budget": 7,
          "upTo": true,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "traits": [
                  "Cyborg",
                  "SoC"
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 [Cyborg]/[SoC] trait card from your trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
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
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": ["Digimon"]
          },
            "budget": 7,
          "upTo": true,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "traits": [
                  "Cyborg",
                  "SoC"
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 [Cyborg]/[SoC] trait card from your trash as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
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
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "leaveCause": "byOpponentEffect",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Prevent",
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "controllerDefault": "mine",
                    "traits": [
                      "Cyborg",
                      "Machine",
                      "SoC"
                    ]
                  },
                  "count": 2
                },
                "raw": "by trashing 2 [Cyborg]/[Machine]/[SoC] trait cards in its digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "SoC"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Machinedramon"
          ],
          "traits": [
            "Cyborg"
          ]
        }
      ],
      "count": 1
    }
  ]
};

registerIrCard("BT17-057", compiled);
