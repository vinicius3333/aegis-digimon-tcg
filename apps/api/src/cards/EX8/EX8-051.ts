// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Collision",
          "raw": "＜Collision＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Fragment",
          "amount": 3,
          "raw": "＜Fragment (3)＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX8-051", compiled);
