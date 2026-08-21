// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
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
          "amount": 3
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": -6000,
          "duration": "forTheTurn"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "NSo"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all",
            "totalPlayCost": 10
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          },
          "optional": true
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
            "controllerDefault": "both",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "zone": "security",
                  "controller": "opponent",
                  "position": "top"
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
  "residual": []
};

registerIrCard("EX8-064", compiled);
