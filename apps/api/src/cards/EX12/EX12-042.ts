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
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Salamon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "level": 3,
      "traits": [
        "NSp",
        "VB"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX12-042", compiled);
