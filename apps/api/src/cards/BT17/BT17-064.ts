// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 2,
          "fromTop": false
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttacking",
          "sourceFilter": {
            "isSelfRef": true
          },
          "condition": {
            "kind": "targetHasNone",
            "filter": {
              "digivolutionCards": "hasAny"
            },
            "raw": "when this Digimon attacks an opponent's Digimon with no digivolution cards"
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "digivolutionCards": "hasNone"
                },
                "count": 1,
                "isCombatTarget": true
              }
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
      "names": [
        "Patamon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-064", compiled);
