// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "play",
          "amount": 1,
          "target": {"filter": {"isSelfRef": true}, "count": 1, "isSelf": true},
          "duration": "permanent",
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Three Musketeers"
                  ],
                  "match": "trait"
                }
              ],
              "orFilters": [{"kind": ["Option"], "playCostOneOf": [7]}]
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
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Option"
              ]
            },
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "kind": [
                "Option"
              ],
              "memoryCost": 7
            },
            "count": 1,
            "location": "hand"
          },
          "payCost": false,
          "costReduction": 0
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-112", compiled);
