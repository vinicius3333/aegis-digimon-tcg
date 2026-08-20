// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2,
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By returning 1 of your Digimon to the hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 2,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Night Claw",
                      "Light Fang"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By placing the top card of this Digimon with the [Night Claw]/[Light Fang] trait as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-016", compiled);
