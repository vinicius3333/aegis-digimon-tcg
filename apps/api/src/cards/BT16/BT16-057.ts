// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "DigiPolice"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By placing 1 of your other Digimon with the [DigiPolice] trait as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        },
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attack",
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT16-057", compiled);
export { compiled };
