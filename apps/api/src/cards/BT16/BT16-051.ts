// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "cantLeaveExceptByOwnerOrDeletion",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Kosuke Kisakata"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 [Kosuke Kisakata] from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Dorimon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-051", compiled);
export { compiled };
