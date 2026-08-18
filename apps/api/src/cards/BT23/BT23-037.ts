// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR correction: the inherited played Digimon is bound so its
// can't-digivolve and delayed deletion riders apply only to that Digimon.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "isSelfRef": true,
            "zone": "battleArea"
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "CS"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ],
          "raw": "wouldDigivolve"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 5,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hudie"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true,
          "bindResultAs": "bt23_037_played"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "boundRef": "bt23_037_played"
            },
            "count": 1
          },
          "restriction": "digivolve",
          "duration": "permanent"
        },
        {
          "kind": "DelayedDelete"
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
      "level": 2,
      "traits": [
        "CS"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT23-037", compiled);
