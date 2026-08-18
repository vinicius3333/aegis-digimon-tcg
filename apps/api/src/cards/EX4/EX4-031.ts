// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DigivolutionRequirement has no colorCount field; multicolor:true + colors:['Green'] encodes
// "multicolored including green" (at least 2 colors). The exact 2-color constraint needs
// colorCount:2 — see LANE_A.md CAP-A2.
// text in the printed effectText is the rules reminder for Alliance, not a separate effect).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Alliance",
          "raw": "＜Alliance＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
          "amount": -3000,
          "duration": "forTheTurn",
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
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
          "amount": -3000,
          "duration": "forTheTurn",
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "suspended": true,
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "multicolor": true,
      "colors": [
        "Green"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX4-031", compiled);
