// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q6298: "when effects trash this card from the security stack" — only triggers when
// directly trashed from security (not revealed, not searched). EffectTiming.OnDiscardSecurity
// fires only from that effect-driven trash-from-security seam (GameEngine.fireDiscardedFromSecurity),
// so it is effect-only and self-scoped by construction — no SubTrigger wrapper needed.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDiscardSecurity",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand",
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Angel",
                    "Iliad"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Ascension",
          "raw": "＜Ascension＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-034", compiled);
