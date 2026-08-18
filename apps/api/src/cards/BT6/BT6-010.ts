// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
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
              "keyword": "Piercing",
              "raw": "＜Piercing＞"
            }
          },
          "while": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid",
                    "Ten Warriors"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "this Digimon has [Hybrid] or [Ten Warriors] in its form or type"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-010", compiled);
