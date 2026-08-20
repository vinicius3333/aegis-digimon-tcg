// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with the [Three Musketeers] trait in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "texts": [
        "Three Musketeers"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX7-040", compiled);
