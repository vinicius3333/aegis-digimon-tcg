// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenMoving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Iliad",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 2,
              "upTo": true
            },
            "raw": "By trashing up to 2 [Iliad] or [TS] trait cards from your hand"
          },
          "optional": true,
          "abortOnDecline": true,
          "scaling": {
            "per": 1,
            "usePaidCount": true
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Iliad",
                      "TS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 2,
              "upTo": true
            },
            "raw": "By trashing up to 2 [Iliad] or [TS] trait cards from your hand"
          },
          "optional": true,
          "abortOnDecline": true,
          "scaling": {
            "per": 1,
            "usePaidCount": true
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "traits": [
        "TS"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-008", compiled);
