// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1815: "[Gallantmon] or [X Antibody]" checks card names, not traits.
// The selfDigivolutionStackHasTrait condition with match:"name" is name-based,
// which satisfies the ruling.
// KB Q1812: "if no Digimon is deleted by this effect" = ifThisEffectDidNotDelete.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "lowestDP"
            },
            "count": 1
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "if no Digimon is deleted by this effect"
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "SecurityManipulation",
              "op": "trashTop",
              "controller": "opponent",
              "amount": 1,
              "condition": {
                "kind": "selfDigivolutionStackHasTrait",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Gallantmon",
                        "X Antibody"
                      ],
                      "match": "nameExact"
                    }
                  ]
                },
                "raw": "[Gallantmon] or [X Antibody] is in this Digimon's digivolution cards"
              }
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Gallantmon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-017", compiled);
