// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT8-105 Dark Gaia Force
// effectText: [Main] Choose any number of your opponent's Digimon whose play costs add
//   up to 15 or less and delete them.
// [Security] Delete 1 of your opponent's Digimon with a play cost of 15 or less.
//
// KB Q1783: "any number whose total play costs add up to 15 or less" — budget-delete.
// KB Q1784: minimum 1 Digimon with play cost ≤15 must be chosen.
// KB Q1785: only printed play cost counts (not cost-reduced play cost).
//
// Fix: [Main] must use DeleteBudget (budget:15, upTo:true) so the engine enforces
// the combined play-cost cap. The Security effect correctly deletes 1 Digimon with
// playCostLte:15.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 15,
          "upTo": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 15
            },
            "count": 1
          }
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-105", compiled);
