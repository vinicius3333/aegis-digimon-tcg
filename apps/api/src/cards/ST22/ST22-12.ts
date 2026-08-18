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
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Social",
                    "Navi",
                    "Tool"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "costDelta": -2,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "appFusionRequirement": [
    {
      "names": [
        "Gatchmon",
        "Navimon",
        "Tweetmon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("ST22-12", compiled);
