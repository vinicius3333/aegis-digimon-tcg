// @ts-nocheck
// HAND-FIXED — generator must preserve this file (was AUTO-GENERATED FROM IR).
// Fix: the [When Attacking] gate "if this Digimon has a [Garurumon] digivolution card"
// was left as an unevaluable raw condition (the effect never fired). Compiled to the
// structured `selfDigivolutionStackHasTrait` check with a `match:"name"` ref, per the
// printed text (a digivolution card with [Garurumon] in its NAME).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Garurumon"
                  ],
                  "match": "nameExact"
                }
              ]
            },
            "raw": "this Digimon has a [Garurumon] digivolution card"
          }
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "handAtLeast",
            "value": 8,
            "raw": "you have 8 or more cards in your hand"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-008", compiled);
