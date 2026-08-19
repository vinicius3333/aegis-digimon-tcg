// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Undead", "Dark Animal", "CS"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trash 1 card with the [Undead], [Dark Animal] or [CS] trait from your hand"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Undead", "Dark Animal"],
                "match": "trait"
              }
            ],
            "zone": "trash"
          },
          "from": ["trash"],
          "optional": true
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
      "traits": ["CS"],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT23-062", compiled);
