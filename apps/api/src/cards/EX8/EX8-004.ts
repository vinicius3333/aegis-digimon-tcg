// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "NSp"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "withoutSuspending": false,
              "optional": true,
              "condition": {
                "kind": "selfHasTrait", "filter": {"nameOrTrait": [{"tokens": ["NSp"], "match": "trait"}]},
                "raw": "this Digimon has the [NSp] trait"
              }
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX8-004", compiled);
