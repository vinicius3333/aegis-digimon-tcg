// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// AllTurns SubTrigger: text says "you may suspend this Tamer. If you do, gain 1
// memory, then hatch 1 Digi-Egg card to an empty space in your Breeding Area."
// KB Q3254 confirms hatch fires even when Breeding Area is not empty (but can't
// hatch if it's not empty — however the trigger still fires). Fix:
//   - Suspend is the optional cost-like choice; GainMemory and Hatch are gated on it
//   - All three actions are inside the SubTrigger actions array
//   - GainMemory condition uses ifThisEffectActed (the suspend acted)
//   - Hatch action added
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "digivolutionCards": "hasAny",
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "levelComparison": {
              "op": "gte",
              "value": 5
            }
          },
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "optional": true
            },
            {
              "kind": "GainMemory",
              "amount": 1,
              "condition": {
                "kind": "ifThisEffectActed"
              }
            },
            {
              "kind": "Hatch",
              "controller": "mine",
              "condition": {
                "kind": "ifThisEffectActed"
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
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
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-066", compiled);
