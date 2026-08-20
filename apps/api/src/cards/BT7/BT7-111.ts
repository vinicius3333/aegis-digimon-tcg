// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "amount": 3,
          "raw": "reduce the memory cost when playing this card from your hand by 3",
          "scaling": {
            "per": 10,
            "filter": {
              "zone": "trash",
              "controller": "mine"
            },
            "unit": "trash"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            // "your opponent's Tamers OR level 6 or lower Digimon": the level bounds only the
            // Digimon branch. Flattened into one filter it also bounded Tamers, which carry no
            // level at all, so no Tamer could ever be chosen.
            "filter": {
              "controller": "opponent",
              "kind": ["Tamer"]
            },
            "orFilters": [
              {
                "controller": "opponent",
                "kind": ["Digimon"],
                "levelComparison": {
                  "op": "lte",
                  "value": 6
                }
              }
            ],
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            // "your opponent's Tamers OR level 6 or lower Digimon": the level bounds only the
            // Digimon branch. Flattened into one filter it also bounded Tamers, which carry no
            // level at all, so no Tamer could ever be chosen.
            "filter": {
              "controller": "opponent",
              "kind": ["Tamer"]
            },
            "orFilters": [
              {
                "controller": "opponent",
                "kind": ["Digimon"],
                "levelComparison": {
                  "op": "lte",
                  "value": 6
                }
              }
            ],
            "count": 1
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
        "Lucemon"
      ],
      "cost": 7,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT7-111", compiled);
