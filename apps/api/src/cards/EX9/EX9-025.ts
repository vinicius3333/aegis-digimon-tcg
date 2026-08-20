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
          "keyword": "Training",
          "raw": "＜Training＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
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
          "amount": -2000,
          "duration": "forTheTurn",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By placing your deck's top card face down as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self",
            "faceDown": true
          },
          "optional": true,
          "abortOnDecline": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "digivolutionCards"
          }
        }
      ],
      "frequency": "OncePerTurn"
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
      "level": 3,
      "traits": [
        "DM"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX9-025", compiled);
