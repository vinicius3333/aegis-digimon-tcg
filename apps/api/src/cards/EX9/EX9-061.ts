// @ts-nocheck
// HAND-FIXED IR — do not regenerate
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
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
            "keyword": "Training"
          },
          "duration": "permanent"
        }
      ],
      "keywords": []
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 3,
                "scaling": {
                  "per": 2,
                  "unit": "selfFaceDownDigivolutionCards"
                }
              }
            },
            "count": 1
          },
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
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [
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
            "keyword": "Retaliation"
          },
          "duration": "permanent"
        }
      ],
      "isInherited": true,
      "keywords": []
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

registerIrCard("EX9-061", compiled);
