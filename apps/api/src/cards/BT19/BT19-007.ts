import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "condition": {
        "kind": "youHave",
        "filter": {
          "nameOrTrait": [
            {
              "tokens": [
                "Calumon",
                "Takato Matsuki"
              ],
              "match": "name"
            }
          ],
          "controller": "mine"
        },
        "count": 1,
        "matchPredicate": "HasPermanentsCondition"
      },
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1
        }
      ]
    },
    {
      "trigger": "Static",
      "isInherited": true,
      "condition": {
        "kind": "youHave",
        "filter": {
          "nameOrTrait": [
            {
              "tokens": [
                "Calumon",
                "Takato Matsuki"
              ],
              "match": "name"
            }
          ],
          "controller": "mine"
        },
        "count": 1,
        "matchPredicate": "HasPermanentsCondition"
      },
      "actions": [
        {
          "kind": "DeletionMaxDpModifier",
          "amount": 2000,
          "scope": "self",
          "duration": "permanent",
          "condition": {
            "kind": "memoryAtMost",
            "value": 0
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT19-007", compiled);
