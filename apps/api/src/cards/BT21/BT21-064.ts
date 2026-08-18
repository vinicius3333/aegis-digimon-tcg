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
          "kind": "Draw",
          "controller": "mine",
          "amount": 2,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Guilmon",
                      "Growlmon",
                      "Gallantmon",
                      "Megidramon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Hero"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with [Guilmon]/[Growlmon]/[Gallantmon]/[Megidramon] in its name or the [Hero] trait from your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Gigimon"
      ],
      "cost": 0,
      "isAlternate": true
    },
    {
      "level": 2,
      "traits": [
        "Hero"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-064", compiled);
