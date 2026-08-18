// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
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
          "kind": "Delete",
          "target": {
            "count": 1,
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            }
          }
        },
        {
          "kind": "Delete",
          "target": {
            "count": 1,
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                4
              ]
            }
          }
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

registerIrCard("EX7-056", compiled);
