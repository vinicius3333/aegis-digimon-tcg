// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false,
          "condition": {
            "kind": "raw",
            "raw": "your breeding area is empty"
          },
          "cost": {
            "kind": "return",
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
                      "Three Great Angels"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by returning 1 Digimon card with the [Three Great Angels] trait from your trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT18-033", compiled);
