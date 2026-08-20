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
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "keyword": "Unblockable"
          },
          "duration": "forTheTurn"
        },
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Knightmon",
                    "Knightsmon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "grant": {
            "keyword": "Unblockable"
          },
          "duration": "forTheTurn"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX4-042", compiled);
