// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST19-15 Noble Family Arts
// [Main] 1 of your opponent's Digimon gets -6000 DP for the turn.
// If there are 3 or more Digimon (total across both players), increase
// the DP reduction of this effect by -6000 (so -12000 total to same target).
// KB Q863/Q864 confirm: counts all Digimon both sides; -12000 total to same 1 opponent Digimon.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
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
          "amount": -6000,
          "duration": "forTheTurn"
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "amount": -6000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "totalDigimonCount",
            "op": "gte",
            "value": 3,
            "raw": "if there are 3 or more total Digimon (both players combined) — KB Q863"
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
  "coverage": "partial",
  "residual": [
    "boardCount condition: 'if there are 3 or more Digimon' counts both players' total Digimon — no structured Condition kind for cross-player board count; encoded as raw (KB Q863)"
  ]
};

registerIrCard("ST19-15", compiled);
