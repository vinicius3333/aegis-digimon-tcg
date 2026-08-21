// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
                  "ACCEL"
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
          ]
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Pinamon"
      ],
      "cost": 0,
      "isAlternate": true
    },
    {
      "level": 2,
      "traits": [
        "ACCEL"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-038", compiled);
