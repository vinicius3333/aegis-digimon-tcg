// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "frequency": "OncePerTurn",
      "keywords": [
        {
          "keyword": "Recovery",
          "amount": 1,
          "raw": "＜Recovery +1 (Deck)＞"
        }
      ],
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAddSecurity",
          "fireCondition": {
            "kind": "triggerSecurityIsYours"
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -7000,
              "duration": "forTheTurn"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                }
              },
              "keyword": {
                "keyword": "SecurityAttack",
                "amount": 1,
                "raw": "＜Security Attack +1＞"
              },
              "count": 1,
              "duration": "forTheTurn"
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-041", compiled);
