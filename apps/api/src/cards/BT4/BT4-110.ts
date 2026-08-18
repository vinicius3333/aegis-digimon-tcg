import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited: D-Brigade raises the deletion target's play-cost ceiling; it does not
// reduce the Option's own play cost (KB Q1277).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 3,
              "playCostLteScaling": {
                "per": 1,
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [{ "tokens": ["D-Brigade"], "match": "trait" }]
                },
                "unit": "cards"
              }
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-110", compiled);
