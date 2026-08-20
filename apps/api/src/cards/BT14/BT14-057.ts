// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "optional": true
        }
      ],
      "keywords": [
        {
          "keyword": "Save",
          "raw": "＜Save＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-057", compiled);
