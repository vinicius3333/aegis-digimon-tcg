// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "differentColors": true,
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 2,
            "upTo": true,
            "from": [
              "hand",
              "trash"
            ]
          },
          "underFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "optional": true
        },
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect placed"
          }
        },
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast",
            "count": 4,
            "filter": { "nameOrTrait": [{ "tokens": ["Hybrid"], "match": "trait" }] },
            "raw": "there are 4 or more [Hybrid] trait cards under this Tamer"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "differentColors": true,
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 2,
            "upTo": true,
            "from": [
              "hand",
              "trash"
            ]
          },
          "underFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "optional": true
        },
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect placed"
          }
        },
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "selfDigivolutionStackCountAtLeast",
            "count": 4,
            "filter": { "nameOrTrait": [{ "tokens": ["Hybrid"], "match": "trait" }] },
            "raw": "there are 4 or more [Hybrid] trait cards under this Tamer"
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheAttack",
          "cost": {
            "kind": "attack",
            "raw": "By attacking with this Digimon with the [Hybrid] or [Ten Warriors] trait"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("AD1-020", compiled);
