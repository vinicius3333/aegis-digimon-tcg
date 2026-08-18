// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3258-Q3264 (binding):
//   - Cost reduction is optional ("you may trash").
//   - Applies to the NEXT digivolve this turn only (once-per-use, duration:nextDigivolveThisTurn).
//   - Requires trashing 1 Digimon card from hand matching the digivolving Digimon's color.
//   - Cannot reduce cost for Digimon in the breeding area (KB Q3259).
//   - Color match uses all current colors (multicolor OK, DNA OK).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer in play"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "digivolve",
          "amount": 4,
          "duration": "nextDigivolveThisTurn",
          "zone": "battleArea",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "hand",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 Digimon card in your hand of the same color as the digivolving Digimon"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-071", compiled);
