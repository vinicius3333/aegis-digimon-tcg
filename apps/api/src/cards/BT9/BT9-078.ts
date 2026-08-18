import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Dex",
                      "DeathX"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "X Antibody"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 card with [Dex] or [DeathX] in its name or [X Antibody] in its traits in your hand"
          },
          "optional": true
        }
      ]
    },
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
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "selfHasInDigivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": ["DoruGreymon"],
                    "match": "nameExact"
                  }
                ]
              },
              {
                "kind": "digivolvedFromZone",
                "zone": "trash"
              }
            ]
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "DoruGreymon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-078", compiled);
