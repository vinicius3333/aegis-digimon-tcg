// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBeDeleted",
          "sourceFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Dorugoramon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Prevent",
              "cost": {
                "kind": "raw",
                "raw": "by digivolving it into this card without paying the cost"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "isFromTrash": true
    },
    {
      "trigger": "WhenDigivolving",
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
          "amount": 3,
          "stopAtLevel": 3
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestLevel"
            },
            "count": "all"
          },
          "condition": {
            "kind": "raw",
            "raw": "[Dorugoramon] is in this Digimon's digivolution cards or this card is digivolving from the trash"
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
            "controllerDefault": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Unsuspend",
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
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Dorugoramon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-073", compiled);
