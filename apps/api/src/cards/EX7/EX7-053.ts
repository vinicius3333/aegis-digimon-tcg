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
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Evil",
                    "Dark Dragon",
                    "Evil Dragon"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Retaliation",
          "raw": "＜Retaliation＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX7-053", compiled);
