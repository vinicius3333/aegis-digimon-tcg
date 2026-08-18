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
                "playCostLte": 4,
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
                "playCostLte": 4,
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
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "RevealAdd",
              "revealCount": 3,
              "add": [],
              "rest": "deckBottom"
            }
          ]
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "name": "Commandramon"
            },
            "count": 1,
            "upTo": false
          },
          "payCost": false,
          "optional": true
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controllerDefault": "mine"
            },
            "count": 1
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-064", compiled);
